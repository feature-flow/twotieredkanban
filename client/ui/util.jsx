import React from 'react';

import {Button, IconButton} from 'react-toolbox/lib/button';
import {IconMenu} from 'react-toolbox/lib/menu';
import Tooltip from 'react-toolbox/lib/tooltip';

module.exports = {
  TooltipButton: Tooltip(Button),
  TooltipIconButton: Tooltip(IconButton),
  TooltipIconMenu: Tooltip(IconMenu)
};
