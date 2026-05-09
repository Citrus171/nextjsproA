import { BadRequestException } from "@nestjs/common";
import { ImageProcessingService } from "./image-processing.service";

jest.mock("sharp", () =>
  jest.fn().mockReturnValue({
    rotate: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from("processed")),
  })
);

describe("ImageProcessingService", () => {
  let service: ImageProcessingService;

  beforeEach(() => {
    service = new ImageProcessingService();
    jest.clearAllMocks();
    const sharpMock = jest.requireMock("sharp") as jest.Mock;
    sharpMock.mockReturnValue({
      rotate: jest.fn().mockReturnThis(),
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from("processed")),
    });
  });

  it("processが処理済みBufferを返すこと", async () => {
    const input = Buffer.from("raw-image");
    const result = await service.process(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("processed");
  });

  it("width=1200・withoutEnlargement=true でリサイズすること", async () => {
    const sharpMock = jest.requireMock("sharp") as jest.Mock;
    const resizeMock = jest.fn().mockReturnThis();
    const jpegMock = jest.fn().mockReturnThis();
    const toBufferMock = jest.fn().mockResolvedValue(Buffer.from("processed"));
    sharpMock.mockReturnValue({
      rotate: jest.fn().mockReturnThis(),
      resize: resizeMock,
      jpeg: jpegMock,
      toBuffer: toBufferMock,
    });

    await service.process(Buffer.from("raw"));

    expect(resizeMock).toHaveBeenCalledWith({
      width: 1200,
      withoutEnlargement: true,
    });
  });

  it("quality=80 でJPEG変換すること", async () => {
    const sharpMock = jest.requireMock("sharp") as jest.Mock;
    const resizeMock = jest.fn().mockReturnThis();
    const jpegMock = jest.fn().mockReturnThis();
    const toBufferMock = jest.fn().mockResolvedValue(Buffer.from("processed"));
    sharpMock.mockReturnValue({
      rotate: jest.fn().mockReturnThis(),
      resize: resizeMock,
      jpeg: jpegMock,
      toBuffer: toBufferMock,
    });

    await service.process(Buffer.from("raw"));

    expect(jpegMock).toHaveBeenCalledWith({ quality: 80 });
  });

  it("EXIFの向き補正のためrotateを引数なしで呼ぶこと", async () => {
    const sharpMock = jest.requireMock("sharp") as jest.Mock;
    const rotateMock = jest.fn().mockReturnThis();
    sharpMock.mockReturnValue({
      rotate: rotateMock,
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from("processed")),
    });

    await service.process(Buffer.from("raw"));

    expect(rotateMock).toHaveBeenCalledWith();
  });

  it("sharpがエラーをスローした時、BadRequestExceptionになること", async () => {
    const sharpMock = jest.requireMock("sharp") as jest.Mock;
    sharpMock.mockReturnValue({
      rotate: jest.fn().mockReturnThis(),
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockRejectedValue(new Error("corrupt image")),
    });

    try {
      await service.process(Buffer.from("bad"));
      fail("例外がスローされるべき");
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const response = (e as BadRequestException).getResponse();
      expect(response).toMatchObject({
        code: "E_IMAGE_PROCESSING_ERROR",
        message: expect.any(String),
      });
    }
  });
});
