function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
}
function wrapLines(context, text, maxWidth, maxLines = 10) {
    const characters = Array.from(text.replace(/\s+/g, " ").trim());
    const lines = [];
    let current = "";
    for (const character of characters) {
        const candidate = current + character;
        if (context.measureText(candidate).width > maxWidth && current.length > 0) {
            lines.push(current);
            current = character;
            if (lines.length >= maxLines)
                break;
        }
        else {
            current = candidate;
        }
    }
    if (current && lines.length < maxLines)
        lines.push(current);
    if (lines.length === maxLines && characters.join("").length > lines.join("").length) {
        lines[maxLines - 1] = `${lines[maxLines - 1]?.slice(0, -1) ?? ""}…`;
    }
    return lines;
}
function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob)
                resolve(blob);
            else
                reject(new Error("画像を生成できませんでした"));
        }, "image/png");
    });
}
export function drawRadarChart(canvas, abilities) {
    const size = 760;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    canvas.style.aspectRatio = "1";
    const context = canvas.getContext("2d");
    if (!context)
        return;
    context.scale(ratio, ratio);
    context.clearRect(0, 0, size, size);
    const center = size / 2;
    const radius = 245;
    const count = abilities.length;
    const angleAt = (index) => -Math.PI / 2 + (Math.PI * 2 * index) / count;
    context.lineWidth = 1.4;
    for (let level = 1; level <= 5; level += 1) {
        context.beginPath();
        for (let index = 0; index < count; index += 1) {
            const angle = angleAt(index);
            const r = radius * (level / 5);
            const x = center + Math.cos(angle) * r;
            const y = center + Math.sin(angle) * r;
            if (index === 0)
                context.moveTo(x, y);
            else
                context.lineTo(x, y);
        }
        context.closePath();
        context.strokeStyle = level === 5 ? "rgba(216,201,170,.45)" : "rgba(216,201,170,.14)";
        context.stroke();
    }
    for (let index = 0; index < count; index += 1) {
        const angle = angleAt(index);
        context.beginPath();
        context.moveTo(center, center);
        context.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);
        context.strokeStyle = "rgba(216,201,170,.13)";
        context.stroke();
    }
    context.beginPath();
    abilities.forEach((ability, index) => {
        const angle = angleAt(index);
        const normalized = 0.15 + ability.percentile * 0.85;
        const x = center + Math.cos(angle) * radius * normalized;
        const y = center + Math.sin(angle) * radius * normalized;
        if (index === 0)
            context.moveTo(x, y);
        else
            context.lineTo(x, y);
    });
    context.closePath();
    context.fillStyle = "rgba(130,152,154,.24)";
    context.strokeStyle = "rgba(216,201,170,.9)";
    context.lineWidth = 3;
    context.fill();
    context.stroke();
    abilities.forEach((ability, index) => {
        const angle = angleAt(index);
        const normalized = 0.15 + ability.percentile * 0.85;
        const x = center + Math.cos(angle) * radius * normalized;
        const y = center + Math.sin(angle) * radius * normalized;
        context.beginPath();
        context.arc(x, y, 5, 0, Math.PI * 2);
        context.fillStyle = index === 8 ? "#b65f55" : "#d8c9aa";
        context.fill();
        const labelRadius = radius + 56;
        const lx = center + Math.cos(angle) * labelRadius;
        const ly = center + Math.sin(angle) * labelRadius;
        context.fillStyle = "#ece9e2";
        context.font = "700 22px sans-serif";
        context.textAlign = Math.cos(angle) > 0.22 ? "left" : Math.cos(angle) < -0.22 ? "right" : "center";
        context.textBaseline = Math.sin(angle) > 0.7 ? "top" : Math.sin(angle) < -0.7 ? "bottom" : "middle";
        context.fillText(ability.shortLabel, lx, ly);
        context.fillStyle = "#aeb7bb";
        context.font = "18px sans-serif";
        context.fillText(String(ability.value), lx, ly + (Math.sin(angle) < -0.7 ? -28 : 28));
    });
}
export async function createResultCardBlob(input) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context)
        throw new Error("Canvasを使用できません");
    const bg = context.createLinearGradient(0, 0, 1080, 1350);
    bg.addColorStop(0, "#1d272c");
    bg.addColorStop(0.55, "#101619");
    bg.addColorStop(1, "#090d0f");
    context.fillStyle = bg;
    context.fillRect(0, 0, 1080, 1350);
    context.save();
    context.globalAlpha = 0.12;
    context.strokeStyle = "#d8c9aa";
    context.lineWidth = 2;
    for (let x = -700; x < 1500; x += 82) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + 900, 1350);
        context.stroke();
    }
    context.restore();
    context.strokeStyle = "rgba(216,201,170,.72)";
    context.lineWidth = 6;
    context.beginPath();
    context.arc(890, 175, 108, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = "#b65f55";
    context.lineWidth = 9;
    context.beginPath();
    context.moveTo(890, 67);
    context.lineTo(890, 175);
    context.lineTo(998, 175);
    context.stroke();
    context.fillStyle = "#d8c9aa";
    context.font = "700 25px sans-serif";
    context.letterSpacing = "4px";
    context.fillText(input.config.appName, 72, 86);
    context.fillStyle = "#f1ede4";
    context.font = "700 55px serif";
    context.fillText(input.config.scenarioTitle, 72, 157);
    context.fillStyle = "#b65f55";
    context.font = "700 24px sans-serif";
    context.fillText(input.ending.title, 72, 235);
    context.fillStyle = "#f1ede4";
    context.font = "700 43px serif";
    const profileLines = wrapLines(context, input.profileTitle, 850, 2);
    profileLines.forEach((line, index) => context.fillText(line, 72, 310 + index * 56));
    context.fillStyle = "#aeb7bb";
    context.font = "24px sans-serif";
    const summaryLines = wrapLines(context, input.profileSummary, 930, 4);
    summaryLines.forEach((line, index) => context.fillText(line, 72, 430 + index * 36));
    roundedRect(context, 62, 590, 956, 560, 24);
    context.fillStyle = "rgba(241,237,228,.055)";
    context.fill();
    context.strokeStyle = "rgba(216,201,170,.25)";
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = "#d8c9aa";
    context.font = "700 23px sans-serif";
    context.fillText("6版風ステータス｜β版暫定換算", 94, 642);
    const columnWidth = 420;
    input.abilities.forEach((ability, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = 94 + column * 470;
        const y = 705 + row * 82;
        context.strokeStyle = "rgba(216,201,170,.13)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x, y + 41);
        context.lineTo(x + columnWidth, y + 41);
        context.stroke();
        context.fillStyle = "#d8c9aa";
        context.font = "800 23px sans-serif";
        context.fillText(ability.shortLabel, x, y);
        context.fillStyle = "#aeb7bb";
        context.font = "19px sans-serif";
        context.fillText(ability.label, x + 76, y);
        context.fillStyle = "#f1ede4";
        context.font = "800 39px serif";
        context.textAlign = "right";
        context.fillText(String(ability.value), x + columnWidth, y + 4);
        context.textAlign = "left";
    });
    context.fillStyle = "#aeb7bb";
    context.font = "21px sans-serif";
    const endingLines = wrapLines(context, input.ending.summary, 930, 3);
    endingLines.forEach((line, index) => context.fillText(line, 72, 1210 + index * 31));
    context.fillStyle = "#788389";
    context.font = "18px sans-serif";
    context.fillText(`v${input.config.version}｜能力値はβ版の固定換算であり、人格や能力の優劣を示しません。`, 72, 1320);
    return canvasToBlob(canvas);
}
export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
//# sourceMappingURL=visuals.js.map