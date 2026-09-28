-- Generated from cosplay_pictures.zip
-- Image metadata catalog (image bytes are not embedded). Works in SQLite; adjust auto-increment syntax for other databases.

CREATE TABLE cosplay_pictures_categories (
  category_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE cosplay_pictures_images (
  image_id INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES cosplay_pictures_categories(category_id),
  file_name TEXT NOT NULL,
  zip_path TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  width_px INTEGER,
  height_px INTEGER,
  format TEXT,
  sha256 TEXT NOT NULL
);

CREATE INDEX idx_cosplay_pictures_images_category ON cosplay_pictures_images(category_id);
CREATE INDEX idx_cosplay_pictures_images_sha256 ON cosplay_pictures_images(sha256);

INSERT INTO cosplay_pictures_categories (category_id, name) VALUES
  (1, 'cosplay pictures');

INSERT INTO cosplay_pictures_images (image_id, category_id, file_name, zip_path, file_size_bytes, width_px, height_px, format, sha256) VALUES
  (1, 1, 'Anime Cosplay Photoshoot Ideas 🎭📸 _ Creative Anime Cosplay Poses.jpg', 'cosplay pictures/Anime Cosplay Photoshoot Ideas 🎭📸 _ Creative Anime Cosplay Poses.jpg', 243528, 736, 1104, 'JPEG', '4de7cd62829672acd2235f90bd5dbd4fbb5edcaf825c3b6deac9737aa0611eef'),
  (2, 1, 'Create a Naruto fashion designer outfit.jpg', 'cosplay pictures/Create a Naruto fashion designer outfit.jpg', 113244, 735, 919, 'JPEG', 'd916da90cf39e22496b926e66b66408042f6973a1f5d4dada7e7ca2d7cf91d1f'),
  (3, 1, 'download (10).jpg', 'cosplay pictures/download (10).jpg', 147055, 736, 1308, 'JPEG', 'b677ab77ac9fb04346ef9cd0814741458b4f982373555be6a6e5738e536b9f90'),
  (4, 1, 'download (11).jpg', 'cosplay pictures/download (11).jpg', 147055, 736, 1308, 'JPEG', 'b677ab77ac9fb04346ef9cd0814741458b4f982373555be6a6e5738e536b9f90'),
  (5, 1, 'download (12).jpg', 'cosplay pictures/download (12).jpg', 206535, 736, 1307, 'JPEG', '5f64b366ef5a078ab9f8a5adfc5fcd26048c811447673cfa0ffbcd1f018977a1'),
  (6, 1, 'download (13).jpg', 'cosplay pictures/download (13).jpg', 206535, 736, 1307, 'JPEG', '5f64b366ef5a078ab9f8a5adfc5fcd26048c811447673cfa0ffbcd1f018977a1'),
  (7, 1, 'download (14).jpg', 'cosplay pictures/download (14).jpg', 206535, 736, 1307, 'JPEG', '5f64b366ef5a078ab9f8a5adfc5fcd26048c811447673cfa0ffbcd1f018977a1'),
  (8, 1, 'download (15).jpg', 'cosplay pictures/download (15).jpg', 206535, 736, 1307, 'JPEG', '5f64b366ef5a078ab9f8a5adfc5fcd26048c811447673cfa0ffbcd1f018977a1'),
  (9, 1, 'download (16).jpg', 'cosplay pictures/download (16).jpg', 206535, 736, 1307, 'JPEG', '5f64b366ef5a078ab9f8a5adfc5fcd26048c811447673cfa0ffbcd1f018977a1'),
  (10, 1, 'download (7).jpg', 'cosplay pictures/download (7).jpg', 89388, 736, 1294, 'JPEG', 'd9f1b71e2c7b51f839f1a6118207be468715c85ca3529c65794f9b7b8a90f9ed'),
  (11, 1, 'download (8).jpg', 'cosplay pictures/download (8).jpg', 134193, 735, 1105, 'JPEG', '6d32308fdcca5e8118c56af39fd173c816bbb51f755bbe548fd5fda4dcef415b'),
  (12, 1, 'download (9).jpg', 'cosplay pictures/download (9).jpg', 108487, 720, 1072, 'JPEG', '7e673077595e4b8093e86ce9e20120f0326ed6f13c514222dadab38012f5d40b'),
  (13, 1, 'Hinata (1).jpg', 'cosplay pictures/Hinata (1).jpg', 135934, 736, 1074, 'JPEG', '4044bd62ce20660787312c122491dc9c415e8eb52f3d5d7da67ef69ffd1211fd'),
  (14, 1, 'Hinata y naruto (1).jpg', 'cosplay pictures/Hinata y naruto (1).jpg', 217501, 736, 1308, 'JPEG', 'e959277013c044750bbd2e0758c0d1147d4fab6add9ba56003a22dbac647ab3d'),
  (15, 1, 'Hinata y naruto (2).jpg', 'cosplay pictures/Hinata y naruto (2).jpg', 217501, 736, 1308, 'JPEG', 'e959277013c044750bbd2e0758c0d1147d4fab6add9ba56003a22dbac647ab3d'),
  (16, 1, 'Hinata y naruto (3).jpg', 'cosplay pictures/Hinata y naruto (3).jpg', 217501, 736, 1308, 'JPEG', 'e959277013c044750bbd2e0758c0d1147d4fab6add9ba56003a22dbac647ab3d'),
  (17, 1, 'Hinata y naruto.jpg', 'cosplay pictures/Hinata y naruto.jpg', 217501, 736, 1308, 'JPEG', 'e959277013c044750bbd2e0758c0d1147d4fab6add9ba56003a22dbac647ab3d'),
  (18, 1, 'Hinata.jpg', 'cosplay pictures/Hinata.jpg', 135934, 736, 1074, 'JPEG', '4044bd62ce20660787312c122491dc9c415e8eb52f3d5d7da67ef69ffd1211fd'),
  (19, 1, 'Kushina.jpg', 'cosplay pictures/Kushina.jpg', 162299, 736, 1072, 'JPEG', '151c45d6d9fd9d413e9f5e17ee65e745788f52c3e1c619298f34a059059b03b1'),
  (20, 1, 'Mikey Takes the Lead ⚡ Tokyo Revengers Drop 2 Fashion Editorial _ Tokyo revengers characters outfits, Mikey outfits tokyo revengers fashion, Tokyo revengers characters wallpaper.jpg', 'cosplay pictures/Mikey Takes the Lead ⚡ Tokyo Revengers Drop 2 Fashion Editorial _ Tokyo revengers characters outfits, Mikey outfits tokyo revengers fashion, Tokyo revengers characters wallpaper.jpg', 129664, 736, 1104, 'JPEG', 'ef3f40367760845db7e2b08103717c36bcfbd6c5bc37c38a49af8a19bf968d31'),
  (21, 1, 'Roronoa Zoro.jpg', 'cosplay pictures/Roronoa Zoro.jpg', 271007, 736, 1288, 'JPEG', '15f648a4655f6b0cd03f41a040e750a5313c1a6768f1111dfe39946a85663764'),
  (22, 1, 'Union Arena TCG_ Bleach Thousand-Year War Starter Deck.jpg', 'cosplay pictures/Union Arena TCG_ Bleach Thousand-Year War Starter Deck.jpg', 249288, 736, 1308, 'JPEG', '364747cca2724522afd6d52142bae72869f359cfdc448b1b25378775b2aacaf2'),
  (23, 1, 'Women’s halloween costume ideas.jpg', 'cosplay pictures/Women’s halloween costume ideas.jpg', 115891, 736, 1104, 'JPEG', '5f51bf773d0321198264ac06605d2fd505d6643c8c43e39637e67dfc872921f4');
