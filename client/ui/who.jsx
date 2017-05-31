import React from 'react';
import md5 from 'md5';

module.exports = {
  Gravitar: (props) => {
    console.log(props.email);
    const src = 'https://www.gravatar.com/avatar/' +
            md5(props.email) + '.jpg?s=40&d=wavatar';
    return <img src={src} />;
  }
};
