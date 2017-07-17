import React from 'react';

import intro_html from './intro.html';

const inner_html = {__html: intro_html};

export default (props) => (
  <div className="kb-intro" dangerouslySetInnerHTML={inner_html}>
  </div>
);
