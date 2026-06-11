import { resolvePort } from "./port";

describe("resolvePort", () => {
  it("未設定（undefined）の時はデフォルトの 3000 を返すこと", () => {
    expect(resolvePort(undefined)).toBe(3000);
  });

  it("空文字の時はデフォルトの 3000 を返すこと", () => {
    expect(resolvePort("")).toBe(3000);
  });

  it("数値文字列の時はその値を返すこと", () => {
    expect(resolvePort("8080")).toBe(8080);
  });

  it("非数値文字列の時はデフォルトの 3000 を返すこと", () => {
    expect(resolvePort("abc")).toBe(3000);
  });

  it("0 以下の時はデフォルトの 3000 を返すこと", () => {
    expect(resolvePort("0")).toBe(3000);
    expect(resolvePort("-1")).toBe(3000);
  });

  it("65535 を超える時はデフォルトの 3000 を返すこと", () => {
    expect(resolvePort("65536")).toBe(3000);
  });

  it("ポート範囲の境界値（1 と 65535）はそのまま返すこと", () => {
    expect(resolvePort("1")).toBe(1);
    expect(resolvePort("65535")).toBe(65535);
  });
});
