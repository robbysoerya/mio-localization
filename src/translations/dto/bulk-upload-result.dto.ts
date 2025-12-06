export class BulkUploadResultDto {
  success: boolean;
  totalRows: number;
  created: number;
  updated: number;
  errors: Array<{ row: number; error: string }>;
}
