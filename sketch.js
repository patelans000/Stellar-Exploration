let stars;
let starArray = [];

let camX = 0;
let camY = 0;
let zoomLevel = 1;

let tooltip;

function preload() {
  // Make the Sun subtle: a soft low-alpha halo and a small warm core.
  const radius = scaleRadius(1); // Sun = 1 solar radius

  // Soft halo (low alpha so it doesn't wash out stars)
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 4);
  halo.addColorStop(0, 'rgba(255,220,120,0.12)');
  halo.addColorStop(0.5, 'rgba(255,170,60,0.06)');
  halo.addColorStop(1, 'rgba(255,150,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 4, 0, Math.PI * 2);
  ctx.fill();

  // Small warm core (no pure white)
  ctx.fillStyle = 'rgba(255,200,90,0.95)';
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(4, radius * 0.8), 0, Math.PI * 2);
  ctx.fill();
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(0); // black background

  translate(width / 2 + camX, height / 2 + camY);
  scale(zoomLevel);

  drawDistanceRings();
  drawSun();
  drawStars();
  drawLegend();
}

/* ================= SCALING ================= */

function scaleDistance(ly) {
  return log(ly + 1) * 200; // adjust scale for display
}

function scaleRadius(radius) {
  let r = pow(radius, 0.4) * 6;
  return constrain(r, 2, 50);
}

/* ================= SUN ================= */

function drawSun() {
  let r = scaleRadius(1);

  noStroke();
  // Soft golden glow
  drawingContext.shadowBlur = 80;
  drawingContext.shadowColor = "rgba(255,200,0,0.8)";
  fill(255, 180, 0);
  ellipse(0, 0, r * 2);
  drawingContext.shadowBlur = 0;
}

/* ================= STARS ================= */

function drawStars() {
  let hovered = null;

  for (let i = 0; i < starArray.length; i++) {
    let star = starArray[i];
    let dist = scaleDistance(star["Distance (ly)"]);

    // Spread stars evenly around circle for readability
    let angle = map(i, 0, starArray.length, 0, TWO_PI);
    let x = cos(angle) * dist;
    let y = sin(angle) * dist;

    // Slight vertical offset for depth illusion
    y += sin(i * 0.5) * 20;

    let r = scaleRadius(star["Radius (R/Ro)"]);
    let c = getSpectralColor(star["Spectral Class"]);

    let screenX = (x * zoomLevel) + width / 2 + camX;
    let screenY = (y * zoomLevel) + height / 2 + camY;

    let d = dist(mouseX, mouseY, screenX, screenY);
    let isHover = d < r * zoomLevel;

    push();
    translate(x, y);
    noStroke();

    let twinkle = sin(frameCount * 0.05 + i) * 0.5 + 1;

    // Magical star glow
    drawingContext.shadowBlur = 40 * twinkle;
    drawingContext.shadowColor = colorToRGBA(c, 0.6);
    fill(c);
    ellipse(0, 0, r * 2);
    drawingContext.shadowBlur = 0;

    // Optional hover pulse glow
    if (isHover) {
      hovered = star;
      drawingContext.shadowBlur = 60;
      drawingContext.shadowColor = colorToRGBA(c, 0.9);
      fill(c);
      ellipse(0, 0, r * 3);
      drawingContext.shadowBlur = 0;
    }

    pop();
  }

  updateTooltip(hovered);
}

/* ================= DISTANCE RINGS ================= */

function drawDistanceRings() {
  noFill();
  stroke(255, 40);
  strokeWeight(1);
  textAlign(CENTER);
  textSize(12);

  let intervals = [10, 50, 100, 500, 1000, 2000];

  for (let d of intervals) {
    let r = scaleDistance(d);
    ellipse(0, 0, r * 2);

    fill(255, 100);
    noStroke();
    text(d + " ly", r + 20, -5);
    stroke(255, 40);
  }
}

/* ================= LEGEND ================= */

function drawLegend() {
  resetMatrix();

  let classes = ["O","B","A","F","G","K","M"];

  for (let i = 0; i < classes.length; i++) {
    let c = getSpectralColor(classes[i]);

    fill(c);
    noStroke();
    ellipse(40, 40 + i * 30, 15);

    fill(255);
    textSize(14);
    text(classes[i], 60, 45 + i * 30);
  }
}

/* ================= TOOLTIP ================= */

function updateTooltip(star) {
  if (!star) {
    tooltip.addClass("hidden");
    return;
  }

  tooltip.removeClass("hidden");
  tooltip.position(mouseX + 15, mouseY + 15);

  tooltip.html(`
    <strong>${star["Name"]}</strong><br/>
    Distance: ${star["Distance (ly)"].toFixed(2)} ly<br/>
    Spectral: ${star["Spectral Class"]}<br/>
    Radius: ${star["Radius (R/Ro)"].toFixed(2)} R☉<br/>
    Luminosity: ${star["Luminosity (L/Lo)"].toFixed(2)} L☉
  `);
}

/* ================= INTERACTION ================= */

function mouseDragged() {
  camX += movedX;
  camY += movedY;
}

function mouseWheel(event) {
  zoomLevel *= event.delta > 0 ? 0.9 : 1.1;
  return false;
}

/* ================= COLORS ================= */

function getSpectralColor(spectral) {
  let type = spectral[0];
  let map = {
    O: color(90,190,255),
    B: color(160,210,255),
    A: color(255),
    F: color(255,244,194),
    G: color(255,216,107),
    K: color(255,179,71),
    M: color(255,107,107)
  };
  return map[type] || color(255);
}

function colorToRGBA(c, alpha) {
  return `rgba(${red(c)}, ${green(c)}, ${blue(c)}, ${alpha})`;
}
