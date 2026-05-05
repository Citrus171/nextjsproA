import { BadRequestException } from "@nestjs/common";
import { ImageProcessingService } from "./image-processing.service";

jest.mock("sharp", () =>
  jest.fn().mockReturnValue({
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
      resize: resizeMock,
      jpeg: jpegMock,
      toBuffer: toBufferMock,
    });

    await service.process(Buffer.from("raw"));

    expect(jpegMock).toHaveBeenCalledWith({ quality: 80 });
  });

  it("sharpがエラーをスローした時、BadRequestExceptionになること", async () => {
    const sharpMock = jest.requireMock("sharp") as jest.Mock;
    sharpMock.mockReturnValue({
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockRejectedValue(new Error("corrupt image")),
    });

    await expect(service.process(Buffer.from("bad"))).rejects.toThrow(
      BadRequestException
    );
  });
});
