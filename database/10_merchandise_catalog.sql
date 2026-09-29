-- Generated from Merchandise.zip
-- Image metadata catalog (image bytes are not embedded). Works in SQLite; adjust auto-increment syntax for other databases.

-- CONVERTED FROM SQLITE
--   Like 09_cosplay_pictures_catalog.sql, this was generated as SQLite DDL and
--   fails on MySQL: `INTEGER PRIMARY KEY` does not auto-increment there, and
--   `name TEXT NOT NULL UNIQUE` is rejected with ERROR 1170. See that file for
--   the full explanation; the fix is the same.
--
-- Charset: utf8mb4, matching the schema.

CREATE TABLE merchandise_categories (
  category_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(96) NOT NULL,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_merch_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE merchandise_images (
  image_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id     INT UNSIGNED NOT NULL,
  file_name       VARCHAR(255) NOT NULL,
  zip_path        VARCHAR(500) NOT NULL,
  file_size_bytes INT UNSIGNED NOT NULL,
  width_px        INT UNSIGNED NULL,
  height_px       INT UNSIGNED NULL,
  format          VARCHAR(16)  NULL,
  sha256          CHAR(64) NOT NULL,
  PRIMARY KEY (image_id),
  KEY ix_merch_images_category (category_id),
  KEY ix_merch_images_sha256 (sha256),
  CONSTRAINT fk_merch_images_category
    FOREIGN KEY (category_id) REFERENCES merchandise_categories (category_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_merchandise_images_category ON merchandise_images(category_id);
CREATE INDEX idx_merchandise_images_sha256 ON merchandise_images(sha256);

INSERT INTO merchandise_categories (category_id, name) VALUES
  (1, 'Anime'),
  (2, 'cosplay'),
  (3, 'k pop');

INSERT INTO merchandise_images (image_id, category_id, file_name, zip_path, file_size_bytes, width_px, height_px, format, sha256) VALUES
  (1, 1, '#الرياض #riyadh_ (1).jpg', 'Merchandise/Anime/#الرياض #riyadh_ (1).jpg', 284273, 736, 1308, 'JPEG', 'c965cfd8b52d90df41b5696a3e82a22fe0d6edd5c8efafe16b3157bdf042ade9'),
  (2, 1, '#الرياض #riyadh_.jpg', 'Merchandise/Anime/#الرياض #riyadh_.jpg', 284273, 736, 1308, 'JPEG', 'c965cfd8b52d90df41b5696a3e82a22fe0d6edd5c8efafe16b3157bdf042ade9'),
  (3, 1, 'Anime keychains 🫶🏻✨.jpg', 'Merchandise/Anime/Anime keychains 🫶🏻✨.jpg', 173282, 736, 1104, 'JPEG', '8c8d8c64efaa34e7b7ad2216779756602e831389c2de2509a152d4a848d75e89'),
  (4, 1, 'Anime plushie said (1).jpg', 'Merchandise/Anime/Anime plushie said (1).jpg', 153932, 682, 1200, 'JPEG', '9fdebc6ff9132c405d7a4126ac480289a099d4ce4c00e26367d632b8b90f2c87'),
  (5, 1, 'Anime plushie said.jpg', 'Merchandise/Anime/Anime plushie said.jpg', 153932, 682, 1200, 'JPEG', '9fdebc6ff9132c405d7a4126ac480289a099d4ce4c00e26367d632b8b90f2c87'),
  (6, 1, 'Anya Merch.jpg', 'Merchandise/Anime/Anya Merch.jpg', 151496, 736, 981, 'JPEG', '63459f54c6e0b5e5ec16479233c0beceb1e8e3c428113079ff30025726ead121'),
  (7, 1, 'Best Anime Figures & Collectibles Every Fan Should Own.jpg', 'Merchandise/Anime/Best Anime Figures & Collectibles Every Fan Should Own.jpg', 167601, 736, 1308, 'JPEG', 'c841265b8e3c6bd4f64f400b8b30684429df801a4b7b5a22bd8db9d292368164'),
  (8, 1, 'Custom Anime Water Bottle Collection _ Premium Drinkware Design for Brands.jpg', 'Merchandise/Anime/Custom Anime Water Bottle Collection _ Premium Drinkware Design for Brands.jpg', 95976, 736, 736, 'JPEG', '1f4c17f437b8015cdaa36d87f445d89ea8ee0d401c9c51d61fae60ffae45363d'),
  (9, 1, 'download (14).jpg', 'Merchandise/Anime/download (14).jpg', 144666, 736, 1308, 'JPEG', '866a55ba549e41cc961475b7692a4c02278aad6fb7497a6b7f19ea7b2c980f5a'),
  (10, 1, 'download (15).jpg', 'Merchandise/Anime/download (15).jpg', 81715, 736, 736, 'JPEG', '84fd44891416c889954bd7453057433df0b67864b5dac0c5a6889a3e4b61d2c1'),
  (11, 1, 'download (16).jpg', 'Merchandise/Anime/download (16).jpg', 58581, 650, 650, 'JPEG', '182f74d46b94d8506c072feba37c833f69ce597bf5ff0f447c0c3fdfc1e4517f'),
  (12, 1, 'download (17).jpg', 'Merchandise/Anime/download (17).jpg', 129111, 736, 736, 'JPEG', 'd8b5dd410368fb8f41126c1cc02f8e3eecddac2933f3328c4b377ac69ff4c202'),
  (13, 1, 'EU QRO_.jpg', 'Merchandise/Anime/EU QRO_.jpg', 67720, 474, 615, 'JPEG', '034cddfb03c6ca2d33e1047431a18c369e8f917fe5a6b1e9d9e828b48e62de2e'),
  (14, 1, 'Our Jujutsu Kaisen lookup figures are now finally available pn our website, link is in our bio !! more anime figures will be releasing every single day so stay tuned👾🤍 #anime #jjk #jujutsukaisen #gojosatoru # (1).jpg', 'Merchandise/Anime/Our Jujutsu Kaisen lookup figures are now finally available pn our website, link is in our bio !! more anime figures will be releasing every single day so stay tuned👾🤍 #anime #jjk #jujutsukaisen #gojosatoru # (1).jpg', 44305, 736, 920, 'JPEG', '1d833a76b6645a0793d766e25a581995f0ebd0cd5c45f383800f134065dc36f5'),
  (15, 1, 'Our Jujutsu Kaisen lookup figures are now finally available pn our website, link is in our bio !! more anime figures will be releasing every single day so stay tuned👾🤍 #anime #jjk #jujutsukaisen #gojosatoru # (2).jpg', 'Merchandise/Anime/Our Jujutsu Kaisen lookup figures are now finally available pn our website, link is in our bio !! more anime figures will be releasing every single day so stay tuned👾🤍 #anime #jjk #jujutsukaisen #gojosatoru # (2).jpg', 44305, 736, 920, 'JPEG', '1d833a76b6645a0793d766e25a581995f0ebd0cd5c45f383800f134065dc36f5'),
  (16, 1, 'Our Jujutsu Kaisen lookup figures are now finally available pn our website, link is in our bio !! more anime figures will be releasing every single day so stay tuned👾🤍 #anime #jjk #jujutsukaisen #gojosatoru #nana.jpg', 'Merchandise/Anime/Our Jujutsu Kaisen lookup figures are now finally available pn our website, link is in our bio !! more anime figures will be releasing every single day so stay tuned👾🤍 #anime #jjk #jujutsukaisen #gojosatoru #nana.jpg', 44305, 736, 920, 'JPEG', '1d833a76b6645a0793d766e25a581995f0ebd0cd5c45f383800f134065dc36f5'),
  (17, 1, 'SodaMeow Anime Demon Backpack Nezuko Slayer Bag Kimetsu no Yaiba Backpack Casual with USB Charging Port, Free Keychain, Green-muichiro-d, Large, Casual _ Amazon_ca_ Clothing, Shoes & Accessories.jpg', 'Merchandise/Anime/SodaMeow Anime Demon Backpack Nezuko Slayer Bag Kimetsu no Yaiba Backpack Casual with USB Charging Port, Free Keychain, Green-muichiro-d, Large, Casual _ Amazon_ca_ Clothing, Shoes & Accessories.jpg', 75929, 679, 799, 'JPEG', '9cc22749ec8c555de93aedd081733fc4e3c2ac1b942b2f37f727f4fca0e7d50d'),
  (18, 1, 'Tasse démon slayer.jpg', 'Merchandise/Anime/Tasse démon slayer.jpg', 57737, 736, 981, 'JPEG', '2c2fd6b9281c6dff3e0af312d7e3f92b517fb87aee24c52afd99f99f9d60cbc4'),
  (19, 1, '⚔️ Anime Keychains I’d Actually like to Buy ✨️.jpg', 'Merchandise/Anime/⚔️ Anime Keychains I’d Actually like to Buy ✨️.jpg', 161628, 736, 1307, 'JPEG', '79c62de149e7a952993a94d12a50314fea97efd6a8478d1ef47b03c9b0d06481'),
  (20, 2, 'Attack on Titan Anime Men''s T-shirt Summer Short Sleeved Cartoon Men Women''s T-shirt Cotton 2026 (1).jpg', 'Merchandise/cosplay/Attack on Titan Anime Men''s T-shirt Summer Short Sleeved Cartoon Men Women''s T-shirt Cotton 2026 (1).jpg', 95578, 736, 981, 'JPEG', 'cc6bd0d5cc4c219aecb7984228b2955ff50427dbdbda403dfc514583abbdb817'),
  (21, 2, 'download (10).jpg', 'Merchandise/cosplay/download (10).jpg', 115565, 736, 736, 'JPEG', '6ad86566181da99eeaa60a3854c5087b7d4f1f55795f7b7b1890b4849636c0ea'),
  (22, 2, 'download (12).jpg', 'Merchandise/cosplay/download (12).jpg', 105308, 735, 1015, 'JPEG', '14fb38ab73ab67f2233743bfa8931ec9659a6a9c6bd9cbdd4d3d8a5013cfd6cc'),
  (23, 2, 'download (9).jpg', 'Merchandise/cosplay/download (9).jpg', 75969, 735, 979, 'JPEG', 'd0e33c6a599c070dc404cfe8baee739f102da567959930d8ff1ae7673819e146'),
  (24, 2, 'Monkey D_ Luffy _ Tokoh Fiktif _ One Piece.jpg', 'Merchandise/cosplay/Monkey D_ Luffy _ Tokoh Fiktif _ One Piece.jpg', 124749, 736, 1307, 'JPEG', 'e31f555c25fbde32cb03016de9da6c28ea303a40eb84a829aac38f73e788effb'),
  (25, 2, 'Narutos New Anime 500ML Stainless Steel Water Bottle Thermos Adult Large Capacity Portable Drinking.jpg', 'Merchandise/cosplay/Narutos New Anime 500ML Stainless Steel Water Bottle Thermos Adult Large Capacity Portable Drinking.jpg', 119091, 736, 736, 'JPEG', '7e53bb769d630f76ca44bbe27ead139d0fee231c3a9988ebf3ddbe23b61b93eb'),
  (26, 2, 'one piece.jpg', 'Merchandise/cosplay/one piece.jpg', 211080, 736, 981, 'JPEG', '78219681ebf95b44c86143183fd842559fd75ae59fa1d940809cbae6ca860117'),
  (27, 2, 'Remera Naruto Uzumaki Anime Algodon Serigrafia _ MercadoLibre.jpg', 'Merchandise/cosplay/Remera Naruto Uzumaki Anime Algodon Serigrafia _ MercadoLibre.jpg', 57077, 665, 944, 'JPEG', '73b74fa908e9bc593666dbc339d6fd3fc13a2689e38eb3e5148f0926bb78d1f4'),
  (28, 2, '📚 📖 ____.jpg', 'Merchandise/cosplay/📚 📖 ____.jpg', 91209, 736, 736, 'JPEG', 'f8220a8f2634161ddd434eb1babb44fb0c591861ab33b79618e4455b42bebc76'),
  (29, 3, 'Black pink Merchandise (1).jpg', 'Merchandise/k pop/Black pink Merchandise (1).jpg', 26719, 736, 789, 'JPEG', '062ef255be5f7788fb81380c306be3cb56ac1c785bb60eff9cd01755bda1a08d'),
  (30, 3, 'Black pink Merchandise.jpg', 'Merchandise/k pop/Black pink Merchandise.jpg', 26719, 736, 789, 'JPEG', '062ef255be5f7788fb81380c306be3cb56ac1c785bb60eff9cd01755bda1a08d'),
  (31, 3, 'Blackpink cartera hym.jpg', 'Merchandise/k pop/Blackpink cartera hym.jpg', 79140, 736, 981, 'JPEG', '9badd4f005cd588037804558ac3f7ab9b907c544146618e217fabf18cc5edec9'),
  (32, 3, 'blackpink notebook dairy 🖤💗🌹 shop at Amazon 😍🎧.jpg', 'Merchandise/k pop/blackpink notebook dairy 🖤💗🌹 shop at Amazon 😍🎧.jpg', 80290, 720, 949, 'JPEG', '2d23d7853c758f135667b338460fdca054011367170388011068ef48b9243f59'),
  (33, 3, 'BLACKPINK 블랙 핑크 Parpadeo Cojín.jpg', 'Merchandise/k pop/BLACKPINK 블랙 핑크 Parpadeo Cojín.jpg', 31846, 564, 564, 'JPEG', 'b4a97bf31814aa0386a7e3a9614c4345e3e675dbb1d2fedab1bf9ce2a1b48b48'),
  (34, 3, 'BTS cap only for 430.jpg', 'Merchandise/k pop/BTS cap only for 430.jpg', 26816, 512, 536, 'JPEG', '7af87d6dc2ab9a3218e26aa07b110c9326ce3bf890c49d6650a75036042a0cb2'),
  (35, 3, 'bts casquette ❣️🌹.jpg', 'Merchandise/k pop/bts casquette ❣️🌹.jpg', 15253, 500, 500, 'JPEG', '36ae30b11c3a6e0397b63c5bbbc85db781496f3be66df52a9b3764d9a6994262'),
  (36, 3, 'Copo Quencher Térmico BTS- Butter _ Shopee Brasil.jpg', 'Merchandise/k pop/Copo Quencher Térmico BTS- Butter _ Shopee Brasil.jpg', 61119, 736, 736, 'JPEG', '8e2a7b5bc038d8c6d29fa783bc8a1942901e4d94449a648856e665541e126a1e'),
  (37, 3, 'Custom BTS Army iPhone 17 Pro Max Black slim case_ #btsarmy #bts.jpg', 'Merchandise/k pop/Custom BTS Army iPhone 17 Pro Max Black slim case_ #btsarmy #bts.jpg', 37514, 735, 775, 'JPEG', '1d8077680cc00625364877133d22270c3c612de9dc1b32082c6c52600d714530'),
  (38, 3, 'download (10).jpg', 'Merchandise/k pop/download (10).jpg', 65779, 736, 981, 'JPEG', 'b877f26753e428b13db893a1ff90e586bbe6c8983011ebd077cff2cf25c15812'),
  (39, 3, 'download (11).jpg', 'Merchandise/k pop/download (11).jpg', 28174, 736, 736, 'JPEG', '9b28e0121523dffdf5f0c80304a9fdafe2d795df3268becff670c74968e7c3c8'),
  (40, 3, 'download (12).jpg', 'Merchandise/k pop/download (12).jpg', 141230, 735, 918, 'JPEG', 'b7b5b9e929c26968c520fc8f343b00bdaa417393b7902c9241b15b8b7d11b98d'),
  (41, 3, 'download (13).jpg', 'Merchandise/k pop/download (13).jpg', 85451, 736, 981, 'JPEG', '10c1cd96cf07f86e699d585ab35307815437a87ee0650dcb38650f85cb508a6a'),
  (42, 3, 'download (7).jpg', 'Merchandise/k pop/download (7).jpg', 82367, 736, 981, 'JPEG', 'b99fbc8662afd2444bfadb3b40d2153cf5da3cc3aaf9dd7b3ceebe4d411d571a'),
  (43, 3, 'download (8).jpg', 'Merchandise/k pop/download (8).jpg', 120520, 736, 795, 'JPEG', '8d34a6d9a457f9f64e9f4d5d73768ae1442243755de8f1f4a70d69fb6f759e02'),
  (44, 3, 'download (9).jpg', 'Merchandise/k pop/download (9).jpg', 44357, 736, 736, 'JPEG', '917663ae159bec641d57b9f931fe870cd3cceaa74c3a306aa1cd66b5a293787c'),
  (45, 3, 'JENNIE T-SHIRT 👕.jpg', 'Merchandise/k pop/JENNIE T-SHIRT 👕.jpg', 80110, 736, 1104, 'JPEG', 'b35a89277bb06bda02b0a4824e25f10bd6790923024eed92212f42488634b37b'),
  (46, 3, 'MY BTS cup.jpg', 'Merchandise/k pop/MY BTS cup.jpg', 53466, 636, 656, 'JPEG', '3d344a0a7fcc2d3365cda042e5941e463ccd95098146d2bff79d42b0f8a6df34'),
  (47, 3, 'Stray Kids Pillow.jpg', 'Merchandise/k pop/Stray Kids Pillow.jpg', 42745, 630, 630, 'JPEG', 'a0382563f068715237c6c69615ddb0c5bfd0e051acd9e5a1d4a20b18e6a576e9'),
  (48, 3, 'Stray Kids “Maniac” Backpack _ SKZOO K-Pop Merch.jpg', 'Merchandise/k pop/Stray Kids “Maniac” Backpack _ SKZOO K-Pop Merch.jpg', 56134, 736, 843, 'JPEG', '21e7a0d8ae926b0d236294240ef5a1a23cfd9bec13ec939869f4ff9178c5699d'),
  (49, 3, 'Stray-Kids Skz It Tape Do It [Evil Skzoo Speaker ver_] _ Express Ship (Random Ver.) _ Amazon.de_ Toys', 'Merchandise/k pop/Stray-Kids Skz It Tape Do It [Evil Skzoo Speaker ver_] _ Express Ship (Random Ver.) _ Amazon.de_ Toys', 27476, 480, 480, 'JPEG', '5d412564380a146b6a3576809758b539b1eb7137fd500d86c27b0c7d62377c5a'),
  (50, 3, '_.. black pink____', 'Merchandise/k pop/_.. black pink____', 45986, 736, 736, 'JPEG', 'e22c564585caa7bcb173a1a65b918eeb624ae80fe8853e44255d9d66b91d96fb');
