const Jimp = require("jimp");

const TOTAL_WEEKS = 12;
const REVIEW_WEEKS = 1;
const DAYS_PER_WEEK = 7;
const TOTAL_DAYS = TOTAL_WEEKS * DAYS_PER_WEEK;
const TOTAL_ROWS = TOTAL_WEEKS + REVIEW_WEEKS;

const MODEL_SIZE = {
  "iphone-12": { width: 1170, height: 2532 },
  "iphone-13": { width: 1170, height: 2532 },
  "iphone-14": { width: 1170, height: 2532 },
  "iphone-15": { width: 1179, height: 2556 },
  "iphone-16": { width: 1179, height: 2556 },
  "iphone-17": { width: 1179, height: 2556 }
};

function toISO(date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, n) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function getMonday(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDate(date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function color(r, g, b, a = 255) {
  return Jimp.rgbaToInt(r, g, b, a);
}

function circleImage(size, rgbaInt) {
  const img = new Jimp(size, size, 0x00000000);
  const r = size / 2;
  const rr = r * r;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x + 0.5 - r;
      const dy = y + 0.5 - r;
      if (dx * dx + dy * dy <= rr) {
        img.setPixelColor(rgbaInt, x, y);
      }
    }
  }
  return img;
}

module.exports = async function handler(req, res) {
  try {
    const startParam = String(req.query.start || "");
    const modelParam = String(req.query.model || "iphone-15");
    const titleParam = String(req.query.title || "").trim();
    const debug = String(req.query.debug || "") === "1";

    const size = MODEL_SIZE[modelParam] || MODEL_SIZE["iphone-15"];
    const startISO = /^\d{4}-\d{2}-\d{2}$/.test(startParam)
      ? startParam
      : toISO(getMonday(new Date()));
    const start = new Date(`${startISO}T00:00:00`);
    const end = addDays(start, TOTAL_DAYS - 1);
    const todayISO = toISO(new Date());
    const title = titleParam || `${start.getFullYear()} · 12 Week Season`;

    const elapsed = Math.min(
      TOTAL_DAYS,
      Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000) + 1)
    );
    const left = TOTAL_DAYS - elapsed;
    const percent = Math.round((elapsed / TOTAL_DAYS) * 100);

    const img = new Jimp(size.width, size.height, color(15, 16, 19, 255));
    const font64 = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
    const font32 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    const font16 = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

    if (debug) {
      img.print(
        font64,
        0,
        Math.floor(size.height * 0.45),
        { text: "API OK", alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER },
        size.width,
        80
      );
      const buffer = await img.getBufferAsync(Jimp.MIME_PNG);
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=60");
      return res.status(200).send(buffer);
    }

    const centerWidth = size.width;
    const topOffset = Math.floor(size.height * 0.36);

    img.print(
      font64,
      0,
      topOffset,
      { text: title, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER },
      centerWidth,
      80
    );
    img.print(
      font32,
      0,
      topOffset + 92,
      {
        text: `${formatDate(start)} - ${formatDate(end)}`,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
      },
      centerWidth,
      48
    );

    const dotSize = 26;
    const dotGap = 20;
    const labelWidth = 56;
    const rowGap = 14;
    const boardWidth = labelWidth + 20 + DAYS_PER_WEEK * dotSize + (DAYS_PER_WEEK - 1) * dotGap;
    const boardLeft = Math.floor((size.width - boardWidth) / 2);
    const boardTop = topOffset + 170;

    const dotPast = circleImage(dotSize, color(244, 244, 244, 255));
    const dotFuture = circleImage(dotSize, color(61, 64, 70, 255));
    const dotToday = circleImage(dotSize, color(255, 127, 57, 255));

    for (let row = 0; row < TOTAL_ROWS; row += 1) {
      const isReview = row === TOTAL_WEEKS;
      const y = boardTop + row * (dotSize + rowGap) + (isReview ? 8 : 0);

      const label = isReview ? "R" : `W${row + 1}`;
      img.print(font32, boardLeft, y - 3, label, labelWidth, 30);

      for (let col = 0; col < DAYS_PER_WEEK; col += 1) {
        const x = boardLeft + labelWidth + 20 + col * (dotSize + dotGap);
        const date = addDays(start, row * DAYS_PER_WEEK + col);
        const iso = toISO(date);
        const dot = iso === todayISO ? dotToday : iso < todayISO ? dotPast : dotFuture;
        img.composite(dot, x, y);
      }
    }

    img.print(
      font32,
      0,
      boardTop + TOTAL_ROWS * (dotSize + rowGap) + 30,
      { text: `${left}d left · ${percent}%`, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER },
      centerWidth,
      50
    );

    const buffer = await img.getBufferAsync(Jimp.MIME_PNG);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.status(200).send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.stack || err.message : String(err);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(500).send(`wallpaper api error\n${message}`);
  }
};
