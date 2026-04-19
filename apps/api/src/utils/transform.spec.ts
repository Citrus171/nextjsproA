import { parseJsonField } from "./transform";

describe("parseJsonField", () => {
  it("有効なJSON文字列の時、パースされたオブジェクトを返す", () => {
    const result = parseJsonField({ value: '{"name":"Mimi","color":"white"}' });
    expect(result).toEqual({ name: "Mimi", color: "white" });
  });

  it("無効なJSON文字列の時、元の文字列をそのまま返す", () => {
    const result = parseJsonField({ value: "invalid json {" });
    expect(result).toBe("invalid json {");
  });

  it("文字列でない値の時、そのまま返す", () => {
    const obj = { name: "Mimi" };
    const result = parseJsonField({ value: obj });
    expect(result).toBe(obj);
  });

  it("nullの時、そのまま返す", () => {
    expect(parseJsonField({ value: null })).toBeNull();
  });
});
