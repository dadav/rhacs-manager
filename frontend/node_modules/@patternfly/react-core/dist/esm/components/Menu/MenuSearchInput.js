import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Menu/menu.mjs';
export const MenuSearchInput = forwardRef((props, ref) => (
// Update to use the styles object when core adds the class
_jsx("div", Object.assign({}, props, { className: css(`${styles.menuSearch}-input`, props.className), ref: ref }))));
MenuSearchInput.displayName = 'MenuSearchInput';
//# sourceMappingURL=MenuSearchInput.js.map