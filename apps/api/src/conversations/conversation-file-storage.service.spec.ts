import { BadRequestException } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { ConversationFileStorageService } from "./conversation-file-storage.service";
import { ImageProcessingService } from "./image-processing.service";

jest.mock("fs");
jest.mock("uuid", () => ({ v4: () => "test-uuid" }));

const mockImageProcessing = {
  process: jest.fn(),
} as unknown as jest.Mocked<ImageProcessingService>;

describe("ConversationFileStorageService", () => {
  let service: ConversationFileStorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    mockImageProcessing.process.mockResolvedValue(
      Buffer.from("processed-image")
    );
    service = new ConversationFileStorageService(mockImageProcessing);
  });

  describe("saveFile", () => {
    it("画像を処理してuploads/conversations/{conversationId}/{uuid}.jpgに保存し、URLを返すこと", async () => {
      const file = {
        buffer: Buffer.from("raw-image"),
        originalname: "photo.jpg",
        mimetype: "image/jpeg",
      } as Express.Multer.File;

      const result = await service.saveFile("conv-1", file);

      expect(mockImageProcessing.process).toHaveBeenCalledWith(file.buffer);
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result).toBe("uploads/conversations/conv-1/test-uuid.jpg");
    });

    it("ディレクトリが存在しない場合はmkdirSyncで作成すること", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const file = { buffer: Buffer.from("x") } as Express.Multer.File;

      await service.saveFile("conv-2", file);

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), {
        recursive: true,
      });
    });

    it("ディレクトリが既に存在する場合はmkdirSyncを呼ばないこと", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const file = { buffer: Buffer.from("x") } as Express.Multer.File;

      await service.saveFile("conv-3", file);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it("不正なconversationIdでパストラバーサルを防ぐこと", async () => {
      const file = { buffer: Buffer.from("x") } as Express.Multer.File;

      await expect(service.saveFile("../../../etc", file)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("deleteFile", () => {
    it("ファイルが存在する場合は削除すること", () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      service.deleteFile("uploads/conversations/conv-1/test-uuid.jpg");

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it("ファイルが存在しない場合は何もしないこと", () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      service.deleteFile("uploads/conversations/conv-1/test-uuid.jpg");

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it("不正なパスでパストラバーサルを防ぐこと", () => {
      service.deleteFile("../../etc/passwd");
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });
});
