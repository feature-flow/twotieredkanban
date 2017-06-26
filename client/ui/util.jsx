import React from 'react';
import {Button, IconButton, Tooltip} from 'react-toolbox';

module.exports = {
  TooltipButton: Tooltip(Button),
  TooltipIconButton: Tooltip(IconButton)
};
