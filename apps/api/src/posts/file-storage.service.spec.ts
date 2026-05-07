import * as fs from "fs";
import { BadRequestException } from "@nestjs/common";
import { FileStorageService } from "./file-storage.service";
import { ImageProcessingService } from "../shared/image-processing.service";

jest.mock("fs");
const mockFs = fs as jest.Mocked<typeof fs>;

function makeFile(
  name = "photo.jpg",
  buf = Buffer.from("raw")
): Express.Multer.File {
  return {
    originalname: name,
    buffer: buf,
    mimetype: "image/jpeg",
    size: buf.length,
    fieldname: "file",
    encoding: "7bit",
    destination: "",
    filename: "",
    path: "",
    stream: null as never,
  };
}

describe("FileStorageService", () => {
  let service: FileStorageService;
  let imageProcessing: jest.Mocked<ImageProcessingService>;

  beforeEach(() => {
    imageProcessing = {
      process: jest.fn().mockResolvedValue(Buffer.from("processed")),
    } as unknown as jest.Mocked<ImageProcessingService>;
    service = new FileStorageService(imageProcessing);
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.writeFileSync.mockReturnValue(undefined);
    mockFs.mkdirSync.mockReturnValue(undefined as never);
    mockFs.unlinkSync.mockReturnValue(undefined);
    imageProcessing.process.mockResolvedValue(Buffer.from("processed"));
  });

  // ─── saveFile ──────────────────────────────────────────────
  describe("saveFile", () => {
    it("saveFileが uploads/{postId}/{uuid}.jpg 形式のURLを返すこと", async () => {
      const result = await service.saveFile("post-1", makeFile());
      expect(result).toMatch(/^uploads\/post-1\/[0-9a-f-]{36}\.jpg$/);
    });

    it("saveFileがwriteFileSyncを呼ぶこと", async () => {
      await service.saveFile("post-1", makeFile());
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it("ディレクトリが存在しない時、mkdirSyncを呼ぶこと", async () => {
      mockFs.existsSync.mockReturnValue(false);
      await service.saveFile("post-1", makeFile());
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("post-1"),
        { recursive: true }
      );
    });

    it("ディレクトリが存在する時、mkdirSyncを呼ばないこと", async () => {
      mockFs.existsSync.mockReturnValue(true);
      await service.saveFile("post-1", makeFile());
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it("imageProcessing.processに入力Bufferを渡すこと", async () => {
      const buf = Buffer.from("my-image-data");
      await service.saveFile("post-1", makeFile("img.jpg", buf));
      expect(imageProcessing.process).toHaveBeenCalledWith(buf);
    });

    it("保存ファイル名がUUID v4 + .jpg 形式になること", async () => {
      const result = await service.saveFile("post-1", makeFile());
      const fileName = result.split("/").pop()!;
      expect(fileName).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/
      );
    });

    it("元のファイル名（originalname）が保存パスに含まれないこと", async () => {
      const result = await service.saveFile(
        "post-1",
        makeFile("secret-name.png")
      );
      expect(result).not.toContain("secret-name");
    });

    it("imageProcessingがエラーをスローした時、BadRequestExceptionが伝播すること", async () => {
      imageProcessing.process.mockRejectedValue(
        new BadRequestException("画像処理に失敗しました")
      );
      await expect(service.saveFile("post-1", makeFile())).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ─── deleteFile ────────────────────────────────────────────
  describe("deleteFile", () => {
    it("ファイルが存在する時、unlinkSyncを呼ぶこと", () => {
      mockFs.existsSync.mockReturnValue(true);
      service.deleteFile("uploads/post-1/abc.jpg");
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining("abc.jpg")
      );
    });

    it("ファイルが存在しない場合、unlinkSyncを呼ばないこと", () => {
      mockFs.existsSync.mockReturnValue(false);
      service.deleteFile("uploads/post-1/abc.jpg");
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });
  });
});
