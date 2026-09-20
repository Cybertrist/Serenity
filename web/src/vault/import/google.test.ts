import { describe, expect, it } from "vitest";
import { ImportError } from "./bitwarden";
import { parseCsv, parseGoogleExport } from "./google";

// What Google Password Manager writes, including a note with a comma, a quote and a newline.
const CSV = `name,url,username,password,note
Netflix,https://www.netflix.com/login,tristan@exemple.fr,faux-mot-de-passe,
Banque,https://www.banque.fr/,tristan.j,"a,b ""c""
deuxième ligne",
Sans compte,https://exemple.fr/,,,juste une note
,,,,
`;

describe("import Google", () => {
  it("lit un CSV avec guillemets, virgules et sauts de ligne", () => {
    const rows = parseCsv(CSV);
    expect(rows).toHaveLength(5);
    expect(rows[2]?.[3]).toBe('a,b "c"\ndeuxième ligne');
  });

  it("convertit chaque ligne en entrée de connexion", () => {
    const { entries, skipped } = parseGoogleExport(CSV);
    expect(skipped).toBe(1); // la ligne entièrement vide
    expect(entries).toHaveLength(3);
    const [netflix, banque, sans] = entries;
    expect(netflix).toMatchObject({
      type: "login",
      name: "Netflix",
      username: "tristan@exemple.fr",
      password: "faux-mot-de-passe",
      urls: ["https://www.netflix.com/login"],
    });
    expect(banque?.password).toBe('a,b "c"\ndeuxième ligne');
    expect(sans?.notes).toBe("juste une note");
    expect(sans?.password).toBe("");
  });

  it("suit l'ordre des colonnes de l'en-tête, pas leur position", () => {
    const { entries } = parseGoogleExport("password,name,username\nsecret,Forum,tristan\n");
    expect(entries[0]).toMatchObject({ name: "Forum", username: "tristan", password: "secret" });
  });

  it("refuse un fichier qui n'est pas un export de mots de passe", () => {
    expect(() => parseGoogleExport("a,b,c\n1,2,3\n")).toThrow(ImportError);
    expect(() => parseGoogleExport("")).toThrow(ImportError);
  });
});
