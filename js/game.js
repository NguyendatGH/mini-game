// Khởi tạo Kaplay
kaplay({
    width: window.innerWidth,
    height: window.innerHeight,
    background: [0, 0, 0],
    letterbox: true,
});

// 1. Load Hình ảnh (Sprites)
loadSprite("background", "asset/image/background/bg.png");
loadSprite("over_bg", "asset/image/background/over.png");
loadSprite("khoga", "asset/image/item/khoga.png");
loadSprite("basket", "asset/image/item/cairo.jpeg"); // Thay rổ bằng ảnh cairo
loadSprite("deplao", "asset/image/item/deplao.png");
loadSprite("bom", "asset/image/item/bomb.png");      // Quả bom
loadSprite("health", "asset/image/health/Heart.png", {
    sliceX: 3, // Cắt ảnh làm 3 phần theo chiều ngang
});

// 2. Load Âm thanh (Sounds)
loadSound("bgm", "asset/sound/Độ Mixi Formula 1  F1 đè tem.mp3");
loadSound("ting", "asset/sound/GetKhoGa.wav");
loadSound("hurt", "asset/sound/Hurt.wav");
loadSound("miss", "asset/sound/miss.wav");
// Scene chính của Game
scene("game", () => {
    let score = 0;
    let lives = 3;
    let speedMultiplier = 1.0;
    let timeLeft = 300; // 5 phút = 300 giây

    const music = play("bgm", { loop: true, volume: 0.5 });
    let isMuted = false;
    let isPaused = false;

    // Nút Bật/Tắt nhạc (Mute)
    const muteBtn = add([
        rect(48, 48, { radius: 24 }), // Tạo khung tròn
        pos(width() - 30, 30),
        anchor("center"),
        color(30, 30, 30),
        outline(3, rgb(255, 255, 255)),
        area(),
        fixed(),
        z(100),
        "ui_button"
    ]);

    const muteIcon = muteBtn.add([
        text("🔊", { size: 24 }),
        anchor("center"),
    ]);

    // Nút Tạm dừng game (Pause)
    const pauseBtn = add([
        rect(48, 48, { radius: 24 }),
        pos(width() - 90, 30),
        anchor("center"),
        color(30, 30, 30),
        outline(3, rgb(255, 255, 255)),
        area(),
        fixed(),
        z(100),
        "ui_button"
    ]);

    const pauseIcon = pauseBtn.add([
        text("⏸", { size: 24 }),
        anchor("center"),
    ]);

    // Overlay văn bản khi tạm dừng
    const pauseText = add([
        text("GAME PAUSED", { size: 48, font: "monospace" }),
        pos(center()),
        anchor("center"),
        fixed(),
        z(200),
        opacity(0),
    ]);

    // Hiệu ứng Hover cho tất cả các nút UI
    onUpdate("ui_button", (btn) => {
        if (btn.isHovering()) {
            btn.scale = vec2(1.2);
            btn.color = rgb(255, 0, 0); // Đổi sang màu đỏ khi hover
        } else {
            btn.scale = vec2(1);
            btn.color = rgb(30, 30, 30);
        }
    });

    // Hàm xử lý Pause
    function togglePause() {
        isPaused = !isPaused;
        if (isPaused) {
            pauseText.opacity = 1;
            pauseIcon.text = "▶";
            setPaused(true);
        } else {
            pauseText.opacity = 0;
            pauseIcon.text = "⏸";
            setPaused(false);
        }
    }

    pauseBtn.onClick(togglePause);
    onKeyPress("p", togglePause);
    onKeyPress("space", togglePause);

    muteBtn.onClick(() => {
        isMuted = !isMuted;
        if (isMuted) {
            music.volume = 0;
            muteIcon.text = "🔇";
        } else {
            music.volume = 0.5;
            muteIcon.text = "🔊";
        }
    });

    // Thêm Background
    add([
        sprite("background", { width: width(), height: height() }),
        pos(0, 0),
        fixed(),
    ]);

    // Thêm Người chơi (Cái rổ)
    const player = add([
        sprite("basket", { width: 120, height: 120 }), // Cố định cỡ rổ
        pos(center().x, height() - 100),
        area({ scale: 0.8 }), // Hitbox nhỏ hơn rổ một chút cho thật
        anchor("center"),
        "player",
    ]);

    // UI hiển thị điểm
    const scoreLabel = add([
        text(`Score: ${score}`, { size: 32, font: "monospace" }),
        pos(24, 24),
        fixed(),
    ]);

    // UI hiển thị thời gian còn lại
    const timerLabel = add([
        text(`Time: 05:00`, { size: 32, font: "monospace" }),
        pos(width() / 2, 24),
        anchor("top"),
        fixed(),
        z(100),
    ]);

    // Hàm định dạng thời gian mm:ss
    function formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    }

    // UI hiển thị máu (Tim)
    function drawLives() {
        // Xóa sạch các icon tim cũ trước khi vẽ lại
        const currentHearts = get("ui_heart");
        currentHearts.forEach((h) => destroy(h));

        for (let i = 0; i < lives; i++) {
            add([
                sprite("health", { frame: 0 }), // Chỉ lấy 1 quả tim trong bộ 3 quả
                pos(24 + i * 45, 75),
                scale(2.5), // Tăng scale lên vì ảnh gốc đã bị chia nhỏ
                fixed(),
                "ui_heart",
            ]);
        }
    }

    // Vẽ 3 tim lúc bắt đầu
    drawLives();

    // Điều khiển
    onMouseMove(() => {
        player.pos.x = clamp(mousePos().x, 50, width() - 50);
    });

    onKeyDown("left", () => player.move(-600, 0));
    onKeyDown("right", () => player.move(600, 0));

    // Vòng lặp vật phẩm rơi xuống
    loop(0.8, () => {
        const items = ["khoga", "deplao", "bom"];
        const type = choose(items);

        // Tốc độ cơ bản ngẫu nhiên từ 300-500, nhân với hệ số tăng dần
        const fallSpeed = rand(300, 500) * speedMultiplier;

        add([
            sprite(type, { width: 100, height: 100 }), 
            pos(rand(50, width() - 50), -50),
            area({ scale: 0.7 }), 
            anchor("center"),
            offscreen({ destroy: true }),
            move(DOWN, fallSpeed),
            "item",
            type,
        ]);
    });

    // Tăng dần độ khó và đếm ngược thời gian
    onUpdate(() => {
        if (!isPaused) {
            speedMultiplier += dt() * 0.02;
            
            // Đếm ngược
            timeLeft -= dt();
            timerLabel.text = `Time: ${formatTime(timeLeft)}`;

            if (timeLeft <= 0) {
                music.stop();
                go("win", score);
            }
        }
    });

    // Xử lý va chạm
    player.onCollide("khoga", (item) => {
        destroy(item);
        score += 10;
        scoreLabel.text = `Score: ${score}`;
        play("ting");
    });

    player.onCollide("deplao", (item) => {
        destroy(item);
        lives--;
        drawLives(); // Cập nhật lại số tim hiển thị
        shake(10);
        play("hurt");
        if (lives <= 0) {
            music.stop();
            go("over", score);
        }
    });

    player.onCollide("bom", () => {
        music.stop();
        shake(30);
        play("hurt");
        go("over", score);
    });

    player.onCollide("health", (item) => {
        destroy(item);
        if (lives < 5) {
            lives++;
            drawLives(); // Vẽ lại UI khi ăn hồi máu
        }
        play("ting");
    });

    // Nếu vật phẩm rơi xuống đất mà không hứng được
    onUpdate("item", (item) => {
        if (item.pos.y > height()) {
            // Chỉ trừ điểm nếu đó là Khô Gà (đồ ngon mà bỏ lỡ)
            if (item.is("khoga")) {
                score = Math.max(0, score - 5); // Đảm bảo điểm không bị âm
                play("miss");
            }
            
            // Nếu là Bom hoặc Dép Lào thì cứ để rớt tự nhiên, không trừ điểm
            destroy(item);
            scoreLabel.text = `Score: ${score}`;
        }
    });
});

// Scene kết thúc
scene("over", (finalScore) => {
    const highscore = localStorage.getItem("mixi_best") || 0;
    if (finalScore > highscore) {
        localStorage.setItem("mixi_best", finalScore);
    }

    add([
        sprite("over_bg", { width: width(), height: height() }),
    ]);

    add([
        text(`GAME OVER\nScore: ${finalScore}\nBest: ${Math.max(finalScore, highscore)}`, {
            size: 48,
            align: "center"
        }),
        pos(center()),
        anchor("center"),
        color(255, 50, 50),
    ]);

    add([
        text("Click or Space to Replay", { size: 24 }),
        pos(center().x, center().y + 150),
        anchor("center"),
    ]);

    onKeyPress("space", () => go("game"));
    onClick(() => go("game"));
});

go("game");