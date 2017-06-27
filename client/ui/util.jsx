import React from 'react';

import {Button, IconButton} from 'react-toolbox/lib/button';
import Tooltip from 'react-toolbox/lib/tooltip';

module.exports = {
  TooltipButton: Tooltip(Button),
  TooltipIconButton: Tooltip(IconButton)
};
