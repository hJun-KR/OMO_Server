import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import axios from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';
import { QUEUE_EMBEDDING, QUEUE_CRAWLER } from '../../../queue/bull.module';
import type { EmbeddingJob } from '../../../queue/processors/embedding.processor';
import type { CrawlerJob } from '../../../queue/processors/crawler.processor';

// 카테고리당 최대 수집 상품 수 (총 100k 목표 / 카테고리 수)
const TARGET_PER_CATEGORY = 100000;

// 무신사 전체 패션 카테고리 (상위 10개만으로 100k 충분)
const CATEGORIES = [
  '001', // 상의        ~357,000개
  '002', // 아우터      ~120,000개
  '003', // 바지        ~150,000개
  '100', // 원피스/스커트 ~80,000개
  '004', // 가방        ~90,000개
  '103', // 신발        ~100,000개
  '017', // 스포츠/레저  ~40,000개
  '026', // 속옷/홈웨어  ~30,000개
  '005', // 모자        ~50,000개
  '007', // 주얼리/액세서리 ~60,000개
];

interface MusinsaGoods {
  goodsNo: number;
  goodsName: string;
  thumbnail: string;
  brand: string;
  brandName: string;
  price: number;
  goodsLinkUrl: string;
  reviewCount?: number;
  reviewScore?: number;
  saleRate?: number;
}

interface MusinsaPage {
  data: {
    list: MusinsaGoods[];
    pagination: {
      page: number;
      totalCount: number;
      hasNext: boolean;
      nextPageUrl: string | null;
    };
  } | null;
}

@Injectable()
export class MusinsaCrawlerService {
  private readonly logger = new Logger(MusinsaCrawlerService.name);

  private readonly http = axios.create({
    timeout: 15000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Referer: 'https://www.musinsa.com',
    },
  });

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_EMBEDDING)
    private readonly embeddingQueue: Queue<EmbeddingJob>,
    @InjectQueue(QUEUE_CRAWLER)
    private readonly crawlerQueue: Queue<CrawlerJob>,
  ) {}

  /** POST /products/crawl/start → 카테고리별 첫 페이지 큐 등록 */
  async enqueueCrawl() {
    for (const category of CATEGORIES) {
      const firstUrl = `https://api.musinsa.com/api2/dp/v2/plp/goods?gf=A&sortCode=POPULAR&category=${category}&size=60&page=1&caller=CATEGORY`;
      await this.crawlerQueue.add(
        { category, nextUrl: firstUrl, collectedCount: 0 },
        { attempts: 3, backoff: { type: 'fixed', delay: 3000 } },
      );
    }
    this.logger.log(`크롤 시작: ${CATEGORIES.length}개 카테고리, 카테고리당 최대 ${TARGET_PER_CATEGORY}개 목표`);
    return { queued: CATEGORIES.length, targetPerCategory: TARGET_PER_CATEGORY, total: CATEGORIES.length * TARGET_PER_CATEGORY };
  }

  /** CrawlerProcessor에서 호출 — 한 페이지 수집 후 nextUrl 반환 */
  async crawlPage(category: string, nextUrl: string, collectedCount: number): Promise<{
    savedCount: number;
    nextUrl: string | null;
    totalCollected: number;
  }> {
    let page: MusinsaPage;
    try {
      const res = await this.http.get<MusinsaPage>(nextUrl);
      page = res.data;
    } catch {
      return { savedCount: 0, nextUrl: null, totalCollected: collectedCount };
    }

    const list = page?.data?.list ?? [];
    const pagination = page?.data?.pagination;

    if (list.length === 0) {
      return { savedCount: 0, nextUrl: null, totalCollected: collectedCount };
    }

    let savedCount = 0;
    for (const goods of list) {
      const saved = await this.saveGoods(goods, category);
      if (saved) savedCount++;
    }

    const totalCollected = collectedCount + list.length;
    const hasMore = pagination?.hasNext && pagination?.nextPageUrl && totalCollected < TARGET_PER_CATEGORY;

    this.logger.log(
      `크롤: category=${category} page=${pagination?.page} → ${list.length}개 수신 / ${savedCount}개 신규 / 누적 ${totalCollected}개`,
    );

    return {
      savedCount,
      nextUrl: hasMore ? pagination!.nextPageUrl! : null,
      totalCollected,
    };
  }

  private async saveGoods(goods: MusinsaGoods, category: string): Promise<boolean> {
    const externalId = String(goods.goodsNo);

    const existing = await this.prisma.product.findUnique({
      where: { externalId },
      select: { id: true },
    });
    if (existing) return false;

    const product = await this.prisma.product.create({
      data: {
        externalId,
        source: 'MUSINSA',
        name: goods.goodsName,
        brand: goods.brand,
        brandName: goods.brandName,
        thumbnailUrl: goods.thumbnail,
        productUrl: goods.goodsLinkUrl,
        price: goods.price,
        reviewCount: goods.reviewCount,
        reviewScore: goods.reviewScore,
        category,
      },
    });

    if (goods.thumbnail) {
      await this.saveImageAndEnqueue(
        product.id, externalId, goods.brand, category,
        goods.thumbnail, 'thumbnail', 0,
      );
    }

    return true;
  }

  private async saveImageAndEnqueue(
    productId: string,
    goodsNo: string,
    brand: string,
    category: string,
    imageUrl: string,
    imageType: string,
    order: number,
  ) {
    const productImage = await this.prisma.productImage.create({
      data: { productId, imageUrl, imageType, order },
    });

    await this.embeddingQueue.add(
      { productId, productImageId: productImage.id, imageUrl, goodsNo, brand, gender: '', category },
      { attempts: 999, backoff: { type: 'exponential', delay: 10000 } },
    );
  }
}
