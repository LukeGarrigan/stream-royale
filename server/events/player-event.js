const { players, addNewPlayerToLeaderboard } = require('../server');
const config = require('../../configs/defaults');

module.exports = function({ socket }, playerData) {
  playerData.id = socket.id;
  playerData.shield = config.settings.BASE_SHIELD;
  playerData.isUp = false;
  playerData.isDown = false;
  playerData.isLeft = false;
  playerData.isRight = false;
  playerData.isBoosting = false;
  playerData.r = 21;
  playerData.score = 0;

  let playersName = playerData.name.substring(0, 15);
  playerData.name = playersName.replace(/[^\x00-\x7F]/g, "");

  if (config.settings.DEBUG_MODE) {
    playerData.x = 1000;
    playerData.y = 1000;
  }
  players.push(playerData);
  addNewPlayerToLeaderboard(playerData);
}
