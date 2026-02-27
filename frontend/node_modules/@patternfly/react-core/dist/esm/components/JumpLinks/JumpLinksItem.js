import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Children } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/JumpLinks/jump-links.mjs';
import { JumpLinksList } from './JumpLinksList';
import { Button, ButtonVariant } from '../Button';
export const JumpLinksItem = (_a) => {
    var { isActive, href, 
    // eslint-disable-next-line
    node, children, onClick, className } = _a, props = __rest(_a, ["isActive", "href", "node", "children", "onClick", "className"]);
    const childrenArr = Children.toArray(children);
    const sublists = childrenArr.filter((child) => child.type === JumpLinksList);
    children = childrenArr.filter((child) => child.type !== JumpLinksList);
    return (_jsxs("li", Object.assign({ className: css(styles.jumpLinksItem, isActive && styles.modifiers.current, className) }, (isActive && { 'aria-current': 'location' }), props, { children: [_jsx("span", { className: styles.jumpLinksLink, children: _jsx(Button, { variant: ButtonVariant.link, component: "a", href: href, onClick: onClick, children: _jsx("span", { className: styles.jumpLinksLinkText, children: children }) }) }), sublists] })));
};
JumpLinksItem.displayName = 'JumpLinksItem';
//# sourceMappingURL=JumpLinksItem.js.map