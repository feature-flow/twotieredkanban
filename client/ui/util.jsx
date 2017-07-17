import React from 'react';

import {Button, IconButton} from 'react-toolbox/lib/button';
import {IconMenu} from 'react-toolbox/lib/menu';
import Tooltip from 'react-toolbox/lib/tooltip';

export const TooltipButton = Tooltip(Button);
export const TooltipIconButton = Tooltip(IconButton);
export const TooltipIconMenu = Tooltip(IconMenu);
