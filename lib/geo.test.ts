import { test } from "node:test";
import assert from "node:assert/strict";
import { googleMapsUrl, parseLocation, yandexMapsUrl } from "./geo.ts";

test("joylashuv: raqamlar, Google va Yandex havolalari", () => {
  assert.deepEqual(parseLocation("41.311081, 69.240562"), { lat: 41.311081, lng: 69.240562 });
  assert.deepEqual(parseLocation("41.311081 69.240562"), { lat: 41.311081, lng: 69.240562 });
  assert.deepEqual(parseLocation("https://www.google.com/maps/place/Book/@41.3012,69.2701,17z/data=x"), { lat: 41.3012, lng: 69.2701 });
  assert.deepEqual(parseLocation("https://www.google.com/maps/place/X/data=!3d41.29!4d69.21"), { lat: 41.29, lng: 69.21 });
  assert.deepEqual(parseLocation("https://maps.google.com/?q=41.3,69.25"), { lat: 41.3, lng: 69.25 });
  // Yandex: avval uzunlik (lng), keyin kenglik (lat)
  assert.deepEqual(parseLocation("https://yandex.uz/maps/?ll=69.2401%2C41.2995&z=16"), { lat: 41.2995, lng: 69.2401 });
  // O'zbekistondan tashqari yoki tushunarsiz
  assert.equal(parseLocation("55.75, 37.61"), null);
  assert.equal(parseLocation("https://maps.app.goo.gl/abc123"), null);
  assert.equal(parseLocation("Toshkent"), null);
});

test("xarita havolalari", () => {
  assert.equal(yandexMapsUrl({ name: "X", lat: 41.3, lng: 69.2 }), "https://yandex.uz/maps/?pt=69.2,41.3&z=17&l=map");
  assert.match(googleMapsUrl({ name: "Bookhunter", address: "Amir Temur ko'chasi, 129A", city: "Toshkent" }), /query=Bookhunter%2C%20Amir%20Temur/);
});
