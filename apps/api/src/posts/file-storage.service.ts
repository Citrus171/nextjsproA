import { Injectable } from "@nestjs/common";
import { ImageProcessingService } from "../shared/image-processing.service";
import { FileStorageBase } from "../shared/file-storage.base";

@Injectable()
export class FileStorageService extends FileStorageBase {
  protected readonly subdir = "";
  protected readonly invalidIdMessage = "不正なpostIdです";

  constructor(imageProcessing: ImageProcessingService) {
    super(imageProcessing);
  }
}
