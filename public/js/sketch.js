import Player from './Player/Player.js';
import socket from './socket.js';
import HitMarker from './Hitmarker/Hitmarker.js';
import Killfeed from './Killfeed/Killfeed.js';
import Leaderboard from './Leaderboard/Leaderboard.js';
import WinnerLocation from './WinnerLocation/WinnerLocation.js';
import Healthbar from "./Healthbar/Healthbar.js";
import Minimap from "./Minimap/Minimap.js";
import MuteButton from "./MuteButton/MuteButton.js";



import {
  displayIncreasedShieldMessage,
  emitPlayersBullets,
  isWithinScreen,
  playerDisconnected,
  processHitmarker,
  processKillFeedAddition,
  processRespawn,
  removeBullet,
  updateBullets,
  updateFoods,
  updateOtherPlayers
} from './game-logic.js'


let player;
let food = [];
let asteroids = [];
let asteroidCount = 0;
let bullets = [];
let bulletIds = [];
let otherPlayers = [];
let timeSinceLastShot = 0;

let button, input;
let gameStarted = false;
let leaders = [];
let canvas;

let popups = [];
let hitMarker;
let hitMarkerImage;
let hitMarkerSound;
let shotSound;
let explosionSound;
let killfeed;
let leaderboard;
let winnerLocation;
let indicatorImage;
let foodImage;
let lastLoop = new Date();
let frameRate;
let spaceShipImage;
let winnerSpaceShipImage;
let healthbar;
let leaderBoardWinnersId;
let minimap;
let soundOn;
let soundOff;
let muteButton;
socket.on('foods', data => updateFoods(data, food, foodImage));

function loadImages() {
  hitMarkerImage = loadImage("assets/images/hitmarker.png");
  indicatorImage = loadImage("assets/images/indicator.png");
  foodImage = loadImage("assets/images/food.png");
  spaceShipImage = loadImage("assets/images/spaceship.png");
  winnerSpaceShipImage = loadImage("assets/images/winner.png");
  soundOn = loadImage("assets/images/soundOn.png");
  soundOff = loadImage("assets/images/soundOff.png");


}

function loadSounds() {
  shotSound = loadSound('assets/sounds/shot.wav');
  explosionSound = loadSound('assets/sounds/explode1.wav');
  hitMarkerSound = loadSound("assets/sounds/hitmarker.mp3");
  shotSound.setVolume(0.01);
  explosionSound.setVolume(0.2);
}

window.setup = function () {
  canvas = createCanvas(window.innerWidth, window.innerHeight);
  input = createInput();
  input.position(window.innerWidth / 2 - 250, window.innerHeight / 2);
  button = createButton("Play");
  button.position(window.innerWidth / 2 - 250, window.innerHeight / 2 + 80);
  button.mousePressed(function () {

    let inputValue = input.value().replace(/[^\x00-\x7F]/g, "");
    if (inputValue.length >= 2 && inputValue.length < 15) {
      button.style("visibility", "hidden");
      input.style("visibility", "hidden");
      player = new Player(inputValue, spaceShipImage, winnerSpaceShipImage);
      hitMarker = new HitMarker();
      killfeed = new Killfeed();
      leaderboard = new Leaderboard(player, leaders);
      winnerLocation = new WinnerLocation(indicatorImage);
      healthbar = new Healthbar();
      minimap = new Minimap();
      muteButton = new MuteButton(soundOn, soundOff);

      let playerPosition = {
        x: player.pos.x,
        y: player.pos.y,
        angle: player.radians,
        name: player.name
      };
      socket.emit('player', playerPosition);
    }
  });


  socket.on('playerDisconnected', id => playerDisconnected(id, otherPlayers));
  socket.on('heartbeat', data => updateOtherPlayers(data, player, otherPlayers));
  socket.on('bullets', data => updateBullets(data, bulletIds, bullets));
  socket.on('bulletHit', bullet => removeBullet(bullet, bullets));
  socket.on('leaderboard', leaderboard => leaders = leaderboard);
  socket.on('increaseShield', data => displayIncreasedShieldMessage(data, popups, player));
  socket.on('respawn-start', timeOut => processRespawn(player, popups, timeOut));
  socket.on('respawn-end', () => player.respawning = false);
  socket.on('playExplosion', () => {
    if (!muteButton.isMuted) {
      explosionSound.play()
    }
  });
  socket.on('hitMarker', player => hitMarker = processHitmarker(player, hitMarkerImage, hitMarkerSound, muteButton.isMuted));
  socket.on('killfeed', data => processKillFeedAddition(data, killfeed));
  socket.on('processShotSound', () =>  {
    if (!muteButton.isMuted) {
      shotSound.play();
    }
  });

  gameStarted = true;

  loadSounds();
  loadImages();
};


window.mouseWheel = function (event) {
  return false;
};

function displayCurrentWinnerLocation() {
  if (otherPlayers.length > 0) {
    let currentWinner = findCurrentWinner();
    if (currentWinner && currentWinner.id !== player.id) {
      winnerLocation.drawWinnerLocation(player.x, player.y, currentWinner.x, currentWinner.y);
    }
  }
}


window.draw = function () {
  background(0);
  fill(255);
  scale(1);
  textSize(15);
  if (gameStarted && player) {
    displayFramesPerSecond();
    text("X: " + floor(player.pos.x), width - 100, height - 100);
    text("Y: " + floor(player.pos.y), width - 100, height - 75);
    translate(width / 2 - player.pos.x, height / 2 - player.pos.y);
    timeSinceLastShot++;
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].update();
      if (isWithinScreen(player, bullets[i].pos)) {
        bullets[i].display();
      }
      if (bullets[i].hasBulletDiminished()) {
        socket.emit('removeBullet', bullets[i].id);
        bullets.splice(i, 1);
      }
    }

    player.display(leaders);
    for (let i = popups.length - 1; i >= 0; i--) {
      popups[i].update();
      popups[i].display();
      if (!popups[i].isVisible) {
        popups.splice(i, 1);
      }
    }

    drawFood(player);

    socket.emit('angle', player.radians);


    drawOtherPlayers(player, leaderBoardWinnersId);

    hitMarker.display();
    emitPlayersBullets(bullets);

    killfeed.displayKillfeed(player.pos, spaceShipImage, winnerSpaceShipImage);
    leaderboard.updateLeaderboard(player, leaders);
    leaderboard.displayLeaderboard();
    displayCurrentWinnerLocation();
    healthbar.displayHealthbar(player);
    minimap.displayMinimap(player.pos.x, player.pos.y, player.radians, food);
    muteButton.displayMuteButton(player.pos.x - width/2, player.pos.y - height/2);
    if (mouseIsPressed) {
      processPlayerShooting();
    }
  } else {
    drawStartScreen();
  }
};


function drawStartScreen() {
  let position = {
    x: 1000,
    y: 500
  };
  drawFood(position);
  drawOtherPlayers(position);

}


function drawFood(currentPosition) {
  for (let i = food.length - 1; i >= 0; i--) {
    if (isWithinScreen(currentPosition, food[i])) {
      food[i].move();
      food[i].displayFood();
    }
  }
}

function drawOtherPlayers(currentPosition) {
  for (const otherPlayer of otherPlayers) {
    if (isWithinScreen(currentPosition, otherPlayer)) {
      if (leaders.length > 0) {
        leaderBoardWinnersId = leaders[0].id;
      }
      Player.drawOtherPlayer(otherPlayer, leaderBoardWinnersId, spaceShipImage, winnerSpaceShipImage);
    }
  }
}


function displayFramesPerSecond() {
  let thisLoop = new Date();
  let fps = 1000 / (thisLoop - lastLoop);
  lastLoop = thisLoop;

  if (frameCount % 15 === 0) {
    frameRate = fps;
  }
  text("FPS: " + floor(frameRate), width - 100, height - 50);

}


function findCurrentWinner() {
  let winnerId = leaderboard.leaders[0].id;
  for (const player of otherPlayers) {
    if (player.id === winnerId) {
      return player;
    }
  }
}


window.keyPressed = function () {
  if (gameStarted) {
    if (keyCode == UP_ARROW || keyCode == 87) {
      socket.emit('keyPressed', "up");
    } else if (keyCode == DOWN_ARROW || keyCode == 83) {
      socket.emit('keyPressed', "down");
    } else if (keyCode == LEFT_ARROW || keyCode == 65) {
      socket.emit('keyPressed', "left");
    } else if (keyCode == RIGHT_ARROW || keyCode == 68) {
      socket.emit('keyPressed', "right");
    }
  }
};

window.keyReleased = function () {
  if (gameStarted) {
    if (keyCode === UP_ARROW || keyCode === 87) {
      socket.emit('keyReleased', "up");
    } else if (keyCode === DOWN_ARROW || keyCode === 83) {
      socket.emit('keyReleased', "down");
    } else if (keyCode === LEFT_ARROW || keyCode === 65) {
      socket.emit('keyReleased', "left");
    } else if (keyCode === RIGHT_ARROW || keyCode === 68) {
      socket.emit('keyReleased', "right");
    }
  }
}

window.onresize = function () {
  background(0);
  canvas.size(window.innerWidth, window.innerHeight);
  input.position(window.innerWidth / 2 - 250, window.innerHeight / 2);
  button.position(window.innerWidth / 2 - 250, window.innerHeight / 2 + 80);
};


window.mousePressed = function () {
  checkMuteToggled();
  processPlayerShooting();
};



function processPlayerShooting() {
  if (timeSinceLastShot > 15 && !player.respawning) {
    socket.emit('bullet');
    timeSinceLastShot = 0;
  }
}

function checkMuteToggled() {
  if(muteButton) {
    muteButton.checkIfClicked(mouseX, mouseY);
  }

}
