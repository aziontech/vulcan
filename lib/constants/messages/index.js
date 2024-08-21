import build from './build.messages';
import env from './env.messages';
import global from './global.messages'; // generic messages

const Messages = {
  env,
  build,
  ...global,
};

export default Messages;
