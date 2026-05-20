import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import axios from 'axios';

interface DetectedItem {
  name: string;
  category: string;
  confidence: number;
  positionX: number;
  positionY: number;
}

@Injectable()
export class DetectService {
  private readonly logger = new Logger(DetectService.name);
  private readonly aiUrl: string;

  constructor(private readonly config: ConfigService) {
    this.aiUrl = this.config.get<string>('AI_SERVER_URL') as string;
  }

  async detectFromFile(filePath: string): Promise<DetectedItem[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FormData = require('form-data') as typeof import('form-data');
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));

      const response = await axios.post<{ detected: DetectedItem[] }>(
        `${this.aiUrl}/detect`,
        form,
        { headers: form.getHeaders(), timeout: 30000 },
      );

      return response.data.detected;
    } catch (err) {
      this.logger.warn(`AI 감지 실패: ${String(err)}`);
      return [];
    }
  }
}
