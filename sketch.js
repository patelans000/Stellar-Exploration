let isDragging = false;
let stars;
let starArray = [];
let starPositions = {}; // Cache star positions

let camX = 0;
let camY = 0;
let zoomLevel = 1;

let tooltip;

/* ================= LOAD ================= */

function preload() {
  stars = loadJSON("DATA/star_dataset_cleaned.json");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  tooltip = select("#tooltip");

  for (let key in stars) {
    starArray.push(stars[key]);
  }

  // Sort by distance (for depth fading only)
  starArray.sort((a, b) => a["Distance (ly)"] - b["Distance (ly)"]);

  // Calculate and cache star positions
  randomSeed(42); // Fixed seed for consistent positions
  noiseSeed(42);
  for (let i = 0; i < starArray.length; i++) {
    let dist = scaleDistance(starArray[i]["Distance (ly)"]);
    let angle = noise(i * 0.3) * TWO_PI * 4;
    
    starPositions[i] = {
      x: cos(angle) * dist,
      y: sin(angle) * dist
    };
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

/* ================= DRAW ================= */

function draw() {
  background(0);

  translate(width / 2 + camX, height / 2 + camY);
  scale(zoomLevel);

  drawDistanceRings();
  drawSun();
  drawStars();
  resetMatrix();
  drawLegend();
  updateCursor();

}

/* ================= SCALING ================= */

// smoother log scaling
function scaleDistance(ly) {

  let base = min(width, height);

  // Adaptive scaling based on screen size
  let scaleFactor;

  if (base < 500) {
    scaleFactor = base * 0.22;  // small phones
  } else if (base < 900) {
    scaleFactor = base * 0.16;  // tablets / small laptops
  } else {
    scaleFactor = base * 0.12;  // desktops
  }

  return log(ly + 1) * scaleFactor;
}


function scaleRadius(radius) {

  let base = min(width, height);
  let screenFactor = base / 900;

  let r = sqrt(radius) * 4 * screenFactor;

  return constrain(r, 1.5, 40);
}

/* ================= SUN ================= */

function drawSun() {

  let r = scaleRadius(1);

  push();
  noStroke();

  let ctx = drawingContext;

  // Single radial glow like other stars
  let gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3);

  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,200,80,0.9)");
  gradient.addColorStop(1, "rgba(255,170,0,0)");

  ctx.fillStyle = gradient;

  ellipse(0, 0, r * 6);

  // Label
  fill(255);
  textAlign(CENTER);
  textSize(14 / zoomLevel);
  text("Sun (0 ly)", 0, -r * 4);

  pop();
}


/* ================= STARS ================= */

function drawStars() {

  let hovered = null;

  for (let i = 0; i < starArray.length; i++) {

    let star = starArray[i];

    let pos = starPositions[i];
    let x = pos.x;
    let y = pos.y;

    let r = scaleRadius(star["Radius (R/Ro)"]);
    let c = getSpectralColor(star["Spectral Class"]);

    let screenX = (x * zoomLevel) + width / 2 + camX;
    let screenY = (y * zoomLevel) + height / 2 + camY;

    let d = dist2(mouseX, mouseY, screenX, screenY);
    let isHover = d < r * zoomLevel;

    push();
    translate(x, y);
    noStroke();

    let depthAlpha = map(star["Distance (ly)"], 0, 2600, 255, 120);

    // 🌟 Single radial glow
    let ctx = drawingContext;
    let gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2);

    gradient.addColorStop(0, `rgba(255,255,255,${depthAlpha/255})`);
    gradient.addColorStop(0.4, `rgba(${red(c)},${green(c)},${blue(c)},${depthAlpha/255})`);
    gradient.addColorStop(1, `rgba(${red(c)},${green(c)},${blue(c)},0)`);

    ctx.fillStyle = gradient;
    ellipse(0, 0, r * 4);

    // ✨ Soft hover glow (single subtle aura)
    if (isHover) {

      hovered = star;

      let pulse = sin(frameCount * 0.05) * 0.1 + 1.15;

      ctx.shadowColor = "white";
      ctx.shadowBlur = 25 / zoomLevel;

      fill(255, 255, 255, 40);
      ellipse(0, 0, r * 3 * pulse);

      ctx.shadowBlur = 0;
    }

    pop();

    if (isHover && mouseIsPressed) {
      focusOnStar(x, y);
    }
  }

  updateTooltip(hovered);
}



/* ================= FOCUS ================= */

function focusOnStar(x, y) {
  camX = lerp(camX, -x * zoomLevel, 0.08);
  camY = lerp(camY, -y * zoomLevel, 0.08);
  zoomLevel = lerp(zoomLevel, 2.5, 0.05);
}

/* ================= DISTANCE RINGS ================= */

function drawDistanceRings() {

  let intervals = [5, 10, 25, 50, 100, 500, 1000, 2000];

  textAlign(CENTER);
  textSize(12 / zoomLevel);

  for (let d of intervals) {

    let r = scaleDistance(d);

    stroke(255, 40);
    noFill();
    ellipse(0, 0, r * 2);

    // Label
    noStroke();
    fill(255, 120);
    text(d + " ly", 0, -r - 5);
  }
}

/* ================= LEGEND ================= */

function drawLegend() {

  let classes = ["O","B","A","F","G","K","M"];

  for (let i = 0; i < classes.length; i++) {

    let c = getSpectralColor(classes[i]);

    fill(c);
    noStroke();
    ellipse(40, 40 + i * 28, 14);

    fill(255);
    textSize(13);
    text(classes[i], 60, 44 + i * 28);
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
    <div class="title">${star["Name"]}</div>
    <div>Distance: ${star["Distance (ly)"].toFixed(2)} ly</div>
    <div>Spectral: ${star["Spectral Class"]}</div>
    <div>Radius: ${star["Radius (R/Ro)"].toFixed(2)} R☉</div>
    <div>Luminosity: ${star["Luminosity (L/Lo)"].toFixed(2)} L☉</div>
  `);
}


/* ================= INTERACTION ================= */

function mousePressed() {
  isDragging = true;
}

function mouseReleased() {
  isDragging = false;
}

function mouseDragged() {
  camX += movedX;
  camY += movedY;
}

function mouseWheel(event) {
  zoomLevel *= event.delta > 0 ? 0.9 : 1.1;
  zoomLevel = constrain(zoomLevel, 0.4, 6);
  return false;
}


/* ================= COLOR ================= */

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

/* ================= UTIL ================= */

function dist2(x1, y1, x2, y2) {
  return sqrt((x1-x2)**2 + (y1-y2)**2);
}
 function updateCursor() {

  if (isDragging) {
    cursor('grabbing');
    return;
  }

  for (let i = 0; i < starArray.length; i++) {

    let star = starArray[i];
    let pos = starPositions[i];

    let x = pos.x;
    let y = pos.y;

    let r = scaleRadius(star["Radius (R/Ro)"]);

    let screenX = (x * zoomLevel) + width / 2 + camX;
    let screenY = (y * zoomLevel) + height / 2 + camY;

    let d = dist2(mouseX, mouseY, screenX, screenY);

    if (d < r * zoomLevel) {
      cursor('pointer');
      return;
    }
  }

  cursor('grab');
}
