import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FormData = require('form-data') as typeof import('form-data');

import { AiSearchResponse } from './dto/fashion-search.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiUrl: string;

  constructor(private readonly config: ConfigService) {
    this.aiUrl =
      this.config.get<string>('AI_SERVER_URL') ?? 'http://localhost:8000';
  }

  async search(filePath: string): Promise<AiSearchResponse> {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await axios.post<AiSearchResponse>(
      `${this.aiUrl}/search`,
      form,
      { headers: form.getHeaders(), timeout: 60000 },
    );

    return response.data;
  }
}
