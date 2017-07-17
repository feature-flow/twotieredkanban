import React from 'react';
import {TooltipIconButton} from './util';

export class Batch extends React.Component {

  render () {
    const {start, size, count, go} = this.props;
    const end = Math.min(start + size - 1, count - 1);
    return (
      <div className="kb-batch">
        <TooltipIconButton
           icon="|◀"
           tooltip="First batch"
           disabled={! start}
           onMouseUp={() => go(0)}
           />
        <TooltipIconButton
           icon="◀"
           tooltip="Previous batch"
           disabled={! start}
           onMouseUp={() => go(Math.max(start - size, 0))}
           />
        <span className="kb-batch-position">
          {start + 1} to {end + 1} of {count}
        </span>
        <TooltipIconButton
           icon="►"
           tooltip="Next batch"
           disabled={end === (count - 1)}
           onMouseUp={() => go(start + size)}
           />
        <TooltipIconButton
           icon="►|"
           tooltip="Last batch"
           disabled={end === (count - 1)}
           onMouseUp={() => go(count - size)}
           />

      </div>
    );
  }
}
