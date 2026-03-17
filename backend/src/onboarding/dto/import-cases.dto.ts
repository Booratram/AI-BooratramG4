import { IsIn, IsString } from 'class-validator';

export class ImportCasesDto {
  @IsString()
  rawData!: string;

  @IsIn(['json', 'csv'])
  format!: 'json' | 'csv';
}
