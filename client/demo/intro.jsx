import React from 'react';

import intro_html from './intro.html';

const inner_html = {__html: intro_html};

module.exports = 
  (props) => (
    <div className="kb-intro" dangerouslySetInnerHTML={inner_html}>
    </div>
  );
