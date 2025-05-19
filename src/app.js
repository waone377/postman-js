const fs = require("fs");
const path = require("path");
const axios = require("axios");
const prompt = require("prompt-sync")();
const chalk = require("chalk");
const { v4: uuidv4 } = require("uuid");
const FormData = require("form-data");

class PengujiAPI {
  constructor() {
    this.koleksi = [];
    this.muatKoleksi();
  }
  // memuat file koleksi.json

  muatKoleksi() {
    try {
      const data = fs.readFileSync(
        path.join(__dirname, "setup/koleksi.json"),
        "utf8",
      );
      this.koleksi = JSON.parse(data);
    } catch (err) {
      if (err.code === "ENOENT") {
        this.simpanKoleksi();
      } else {
        console.error(chalk.red("Gagal memuat koleksi:"), err);
      }
    }
  }

  // simpan setup di koleksi.json
  simpanKoleksi() {
    const dirPath = path.join(__dirname, "setup");

    // Buat folder jika belum ada
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Simpan file
    fs.writeFileSync(
      path.join(dirPath, "koleksi.json"),
      JSON.stringify(this.koleksi, null, 2),
    );
  }

  // fungsi simpan skema object body
  async isiParameterBody(parameterNames) {
    const body = {};
    console.clear();
    console.log(chalk.yellow("\nSilakan isi nilai setiap parameter body:"));

    for (const param of parameterNames) {
      if (param.startsWith("file:")) {
        const fieldName = param.replace("file:", "");
        console.log("contoh: public/text.txt");
        console.log("kosongkan jika ingin lewati");
        const jalur = prompt(`fieldname('${fieldName}'')
- path file?: public/ `);
        const filePath = `public/${jalur}`;
        if (filePath && fs.existsSync(filePath)) {
          if (filePath.includes(".")) {
            body[fieldName] = {
              type: "file",
              path: filePath,
              filename: path.basename(filePath),
            };
          } else {
            continue;
          }
        } else {
          console.log(chalk.red(`File ${jalur} tidak ditemukan di public !:`));
        }
      } else {
        const nilai = prompt(`- Parameter ${param}?: `);
        body[param] = nilai;
      }
    }

    return body;
  }

  // fungsi buat skema formData
  async buatFormData(body) {
    const formData = new FormData();

    for (const [key, value] of Object.entries(body)) {
      if (value && typeof value === "object" && value.type === "file") {
        formData.append(key, fs.createReadStream(value.path), {
          filename: value.filename,
        });
      } else {
        formData.append(key, value);
      }
    }

    return formData;
  }

  // fungsi main atau menu utama
  async menuUtama() {
    console.clear();
    console.log(chalk.blue.bold("\nAlat Penguji API - CLI seperti Postman\n"));

    const pilihan = [
      "1. Buat koleksi baru",
      "2. Lihat koleksi",
      "3. Jalankan tes API",
      "4. Keluar",
    ].join("\n");

    const input = prompt(
      `${pilihan}\n\nPilih menu (1-${pilihan.split("\n").length}): `,
    );

    switch (input) {
      case "1":
        await this.buatKoleksi();
        break;
      case "2":
        await this.lihatKoleksi();
        break;
      case "3":
        await this.jalankanTes();
        break;
      case "4":
        process.exit(0);
      default:
        console.log(chalk.red("Pilihan tidak valid!"));
        setTimeout(() => this.menuUtama(), 100);
    }
  }

  // fungsi buat koleksi baru
  async buatKoleksi() {
    console.clear();
    const nama = prompt("Masukkan nama koleksi?: ");

    const koleksiBaru = {
      id: uuidv4(),
      nama: nama,
      permintaan: [],
    };

    this.koleksi.push(koleksiBaru);
    this.simpanKoleksi();
    console.log(chalk.green(`\nKoleksi "${nama}" berhasil dibuat!\n`));
    setTimeout(() => this.menuUtama(), 100);
  }

  // fungsi menampilkan data koleksi
  async lihatKoleksi() {
    console.clear();
    if (this.koleksi.length === 0) {
      console.clear();
      console.log(chalk.yellow("\nBelum ada koleksi. Buat dulu!\n"));
      setTimeout(() => this.menuUtama(), 100);
      return;
    }

    console.log(chalk.blue.bold("Daftar Koleksi:\n"));
    this.koleksi.forEach((koleksi, index) => {
      console.log(`${index + 1}. ${koleksi.nama}`);
    });

    const input = prompt("\nPilih koleksi atau 0 untuk kembali: ");
    const pilihan = parseInt(input);

    if (isNaN(pilihan)) {
      console.log(chalk.red("pilihan tidak valid, Masukkan angka!"));
      setTimeout(() => this.lihatKoleksi(), 100);
      return;
    }

    if (pilihan === 0) {
      this.menuUtama();
      return;
    }

    if (pilihan < 1 || pilihan > this.koleksi.length) {
      console.log(chalk.red("Pilihan tidak valid!"));
      setTimeout(() => this.lihatKoleksi(), 100);
      return;
    }

    const koleksiDipilih = this.koleksi[pilihan - 1];
    await this.detailKoleksi(koleksiDipilih.id);
  }

  // opsi menu koleksi
  async detailKoleksi(koleksiId) {
    const koleksi = this.koleksi.find((k) => k.id === koleksiId);

    console.clear();
    console.log(chalk.blue.bold(`\nKoleksi: ${koleksi.nama}\n`));

    const pilihan = [
      "1. Tambah permintaan baru",
      "2. Lihat permintaan",
      "3. Hapus koleksi ini",
      "4. Kembali ke menu utama",
    ].join("\n");

    const input = prompt(
      `${pilihan}\n\nPilih menu (1-${pilihan.split("\n").length}): `,
    );

    switch (input) {
      case "1":
        await this.tambahPermintaan(koleksiId);
        break;
      case "2":
        await this.lihatPermintaan(koleksiId);
        break;
      case "3":
        const koleksiBaru = this.koleksi.filter((e) => e.id !== koleksiId);
        let confirm;
        while (true) {
          confirm = prompt(
            `yakin ingin menghapus koleksi [${koleksi.nama}] (y/n): `,
          ).toLowerCase();
          if (confirm === "y") {
            this.koleksi = koleksiBaru;
            this.simpanKoleksi();
            console.log(chalk.green("koleksi berhasil dihapus"));
            this.lihatKoleksi();
            break;
          } else if (confirm === "n") {
            this.detailKoleksi(koleksiId);
            break;
          } else {
            console.log(chalk.red("silakan masukkan y atau n!"));
          }
        }
        this.lihatKoleksi();
        break;
      case "4":
        this.menuUtama();
        break;
      default:
        console.log(chalk.red("Pilihan tidak valid!"));
        setTimeout(() => this.detailKoleksi(koleksiId), 100);
    }
  }

  // fungsi menambah request permintaan baru
  async tambahPermintaan(koleksiId) {
    const koleksi = this.koleksi.find((k) => k.id === koleksiId);

    console.clear();
    console.log(chalk.blue.bold("\nTambah Permintaan Baru\n"));

    const nama = prompt("Nama permintaan?: ");
    const method = prompt(
      "Metode HTTP (GET/POST/PUT/DELETE) atau lainnya?: ",
    ).toUpperCase();
    const url = prompt("URL endpoint?: ");

    console.log("\nMasukkan header (format JSON, kosongkan untuk default {}):");
    const headers = prompt("Headers?: ") || "{}";

    console.log("\nMasukkan nama parameter body (pisahkan dengan koma):");
    console.log(
      chalk.grey("Untuk parameter file, gunakan format file:nama_fieldname"),
    );
    const parameterInput = prompt(
      "Parameter (contoh: username,file:gambar) silahkan?: ",
    ).replaceAll(" ", "");
    const parameterNames = parameterInput
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p);

    try {
      const parsedHeaders = JSON.parse(headers);

      const permintaan = {
        id: uuidv4(),
        nama,
        method,
        url,
        headers: parsedHeaders,
        parameterNames: parameterNames,
        body: {},
      };

      koleksi.permintaan.push(permintaan);
      this.simpanKoleksi();
      console.log(
        chalk.green(`\nPermintaan "${nama}" berhasil ditambahkan!\n`),
      );
    } catch (e) {
      console.log(chalk.red("Format header tidak valid!"));
    }

    setTimeout(() => this.detailKoleksi(koleksiId), 100);
  }

  // fungsi menampilkan data request atau permintaan
  async lihatPermintaan(koleksiId) {
    const koleksi = this.koleksi.find((k) => k.id === koleksiId);

    if (koleksi.permintaan.length === 0) {
      console.clear();
      console.log(chalk.yellow("\nBelum ada permintaan di koleksi ini.\n"));
      setTimeout(() => this.detailKoleksi(koleksiId), 100);
      return;
    }

    console.clear();
    console.log(chalk.blue.bold(`\nDaftar Permintaan: ${koleksi.nama}\n`));

    koleksi.permintaan.forEach((permintaan, index) => {
      console.log(`${index + 1}. ${permintaan.method} ${permintaan.nama}`);
    });

    const input = prompt("\nPilih permintaan atau 0 untuk kembali: ");
    const pilihan = parseInt(input);

    if (isNaN(pilihan)) {
      console.log(chalk.red("Masukkan angka!"));
      setTimeout(() => this.lihatPermintaan(koleksiId), 100);
      return;
    }

    if (pilihan === 0) {
      this.detailKoleksi(koleksiId);
      return;
    }

    if (pilihan < 1 || pilihan > koleksi.permintaan.length) {
      console.log(chalk.red("Pilihan tidak valid!"));
      setTimeout(() => this.lihatPermintaan(koleksiId), 100);
      return;
    }

    const permintaanDipilih = koleksi.permintaan[pilihan - 1];
    await this.detailPermintaan(koleksiId, permintaanDipilih.id);
  }

  // fungsi mendapatkan permintaan yang dipilih
  async detailPermintaan(koleksiId, permintaanId) {
    const koleksi = this.koleksi.find((k) => k.id === koleksiId);
    const permintaan = koleksi.permintaan.find((p) => p.id === permintaanId);
    console.clear();
    console.log(chalk.blue.bold(`\n menu permintaan\n`));
    console.log(
      "silakan tekan enter 1 kali terlebih dahulu, untuk refresh system..",
    );

    const pilihan = [
      "1. Kirim permintaan",
      "2. Edit permintaan",
      "3. detail permintaan",
      "4. Hapus permintaan",
      "5. Kembali ke koleksi",
    ].join("\n");

    const input = prompt(
      `\n${pilihan}\n\nPilih menu (1-${pilihan.split("\n").length}): `,
    );

    switch (input) {
      case "1":
        await this.kirimPermintaan(permintaan);
        await this.detailPermintaan(koleksiId, permintaanId);
        break;
      case "2":
        await this.editPermintaan(koleksiId, permintaanId);
        break;
      case "3":
        console.clear();
        console.log(
          chalk.blue.bold(`\Konfigurasi permintaan: ${permintaan.nama}\n`),
        );
        console.log(chalk.bold("Metodenya:"), permintaan.method);
        console.log(chalk.bold("request ke:"), permintaan.url);
        console.log(
          chalk.bold("Headers isi:"),
          JSON.stringify(permintaan.headers, null, 2),
        );
        console.log(
          chalk.bold("Body fieldname:"),
          permintaan.parameterNames.join(", "),
        );
        prompt("tekan enter untuk kembali lagi..");
        this.detailPermintaan(koleksiId);

        break;
      case "4":
        await this.hapusPermintaan(koleksiId, permintaanId);
        break;
      case "5":
        this.detailKoleksi(koleksiId);
        break;
      default:
        console.log(chalk.red("Pilihan tidak valid!"));
        await this.detailPermintaan(koleksiId, permintaanId);
    }
  }

  // fungsi mengirimkan request
  async kirimPermintaan(permintaan) {
    try {
      // Isi body secara dinamis
      if (permintaan.method !== "GET" && permintaan.parameterNames.length > 0) {
        permintaan.body = await this.isiParameterBody(
          permintaan.parameterNames,
        );
      } else {
        permintaan.body = {};
      }

      console.clear();
      console.log(chalk.yellow("\nMengirim permintaan...\n"));

      // Cek jika ada file untuk menggunakan FormData
      const hasFile = Object.values(permintaan.body).some(
        (v) => v && typeof v === "object" && v.type === "file",
      );

      let config;
      if (hasFile) {
        const formData = await this.buatFormData(permintaan.body);

        config = {
          method: permintaan.method,
          url: permintaan.url,
          headers: {
            ...permintaan.headers,
            ...formData.getHeaders(),
          },
          data: formData,
        };
      } else {
        config = {
          method: permintaan.method,
          url: permintaan.url,
          headers: permintaan.headers,
          data: permintaan.body,
        };
      }
      const opsion = await config;

      const response = await axios(opsion);

      console.log(chalk.green.bold("Status:"), response.status);
      console.log(chalk.green.bold("Response:"));
      console.log(JSON.stringify(response.data, null, 4));
    } catch (error) {
      console.log(chalk.red.bold("Error:"));
      if (error.response) {
        console.log(chalk.red("Status: "), error.response.status);
        console.log(chalk.red("info:"));
        console.log(JSON.stringify(error.response.data, null, 4));
      } else {
        console.log(chalk.red(error.message));
      }
    }

    prompt("\nTekan Enter untuk melanjutkan...");
  }

  // fungsi mengedit permintaan
  async editPermintaan(koleksiId, permintaanId) {
    const koleksi = this.koleksi.find((k) => k.id === koleksiId);
    const permintaan = koleksi.permintaan.find((p) => p.id === permintaanId);

    console.clear();
    console.log(chalk.blue.bold("\nEdit Permintaan\n"));

    const nama =
      prompt(`Nama permintaan [${permintaan.nama}]: `) || permintaan.nama;
    const method =
      prompt(`Metode HTTP [${permintaan.method}]: `).toUpperCase() ||
      permintaan.method;
    const url = prompt(`URL endpoint [${permintaan.url}]: `) || permintaan.url;

    console.log(`\nHeaders saat ini: ${JSON.stringify(permintaan.headers)}`);
    const headers =
      prompt("Headers baru (JSON): ") || JSON.stringify(permintaan.headers);

    console.log(
      `\nParameter saat ini: ${permintaan.parameterNames.join(", ")}`,
    );
    const parameterInput =
      prompt("Parameter baru (pisahkan dengan koma): ") ||
      permintaan.parameterNames.join(",").replaceAll(" ", "");
    const parameterNames = parameterInput
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p);

    try {
      permintaan.nama = nama;
      permintaan.method = method;
      permintaan.url = url;
      permintaan.headers = JSON.parse(headers);
      permintaan.parameterNames = parameterNames;

      this.simpanKoleksi();
      console.log(chalk.green(`\nPermintaan "${nama}" berhasil diperbarui!\n`));
    } catch (e) {
      console.log(chalk.red("Format header tidak valid!"));
    }

    setTimeout(() => this.detailPermintaan(koleksiId, permintaanId), 100);
  }

  // fungsi menghapus permintaan atau request
  async hapusPermintaan(koleksiId, permintaanId) {
    console.clear();
    const koleksi = this.koleksi.find((k) => k.id === koleksiId);
    const index = koleksi.permintaan.findIndex((p) => p.id === permintaanId);

    const konfirmasi = prompt(
      `Yakin ingin menghapus "${koleksi.permintaan[index]?.nama || "empty"}"? (y/n): `,
    ).toLowerCase();

    if (konfirmasi === "y") {
      const namaTerhapus = koleksi.permintaan[index].nama;
      koleksi.permintaan.splice(index, 1);
      this.simpanKoleksi();
      console.log(
        chalk.green(`\nPermintaan "${namaTerhapus}" berhasil dihapus!\n`),
      );
    }

    this.lihatPermintaan(koleksiId);
  }

  // fungsi untuk menjalankan  test api
  async jalankanTes() {
    console.clear();
    if (this.koleksi.length === 0) {
      console.log(chalk.yellow("\nBelum ada koleksi. Buat dulu!\n"));
      setTimeout(() => this.menuUtama(), 100);
      return;
    }

    const semuaPermintaan = this.koleksi.flatMap((koleksi) =>
      koleksi.permintaan.map((permintaan) => ({
        nama: `${koleksi.nama} - ${permintaan.method} ${permintaan.nama}`,
        koleksiId: koleksi.id,
        permintaanId: permintaan.id,
      })),
    );

    if (semuaPermintaan.length === 0) {
      console.clear();
      console.log(chalk.yellow("\nBelum ada permintaan di semua koleksi.\n"));
      setTimeout(() => this.menuUtama(), 100);
      return;
    }

    console.log(chalk.blue.bold("\nDaftar Permintaan:\n"));
    semuaPermintaan.forEach((permintaan, index) => {
      console.log(`${index + 1}. ${permintaan.nama}`);
    });

    const input = prompt("\nPilih permintaan (nomor) atau 0 untuk kembali: ");
    const pilihan = parseInt(input);

    if (isNaN(pilihan)) {
      console.log(chalk.red("Masukkan angka!"));
      setTimeout(() => this.jalankanTes(), 100);
      return;
    }

    if (pilihan === 0) {
      this.menuUtama();
      return;
    }

    if (pilihan < 1 || pilihan > semuaPermintaan.length) {
      console.log(chalk.red("Pilihan tidak valid!"));
      setTimeout(() => this.jalankanTes(), 100);
      return;
    }

    const permintaanDipilih = semuaPermintaan[pilihan - 1];
    const koleksi = this.koleksi.find(
      (k) => k.id === permintaanDipilih.koleksiId,
    );
    const permintaan = koleksi.permintaan.find(
      (p) => p.id === permintaanDipilih.permintaanId,
    );

    await this.kirimPermintaan(permintaan);
    this.jalankanTes();
  }
}

// Jalankan aplikasi
(async () => {
  const penguji = new PengujiAPI();
  await penguji.menuUtama();
})();
