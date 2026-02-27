import { __rest } from "tslib";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import styles from '@patternfly/react-styles/css/components/Menu/menu.mjs';
import { css } from '@patternfly/react-styles';
const MenuGroupBase = (_a) => {
    var { children, className = '', label, titleId, innerRef, labelHeadingLevel: HeadingLevel = 'h1' } = _a, props = __rest(_a, ["children", "className", "label", "titleId", "innerRef", "labelHeadingLevel"]);
    const Wrapper = typeof label === 'function' ? label : HeadingLevel;
    const hasLabel = label !== undefined && label !== null && label !== '';
    return (_jsx("section", Object.assign({}, props, { className: css(styles.menuGroup, className), ref: innerRef, children: _jsxs(_Fragment, { children: [hasLabel && (_jsx(_Fragment, { children: ['function', 'string'].includes(typeof label) ? (_jsx(Wrapper, { className: css(styles.menuGroupTitle), id: titleId, children: label })) : (label) })), children] }) })));
};
export const MenuGroup = forwardRef((props, ref) => (_jsx(MenuGroupBase, Object.assign({}, props, { innerRef: ref }))));
MenuGroup.displayName = 'MenuGroup';
//# sourceMappingURL=MenuGroup.js.map