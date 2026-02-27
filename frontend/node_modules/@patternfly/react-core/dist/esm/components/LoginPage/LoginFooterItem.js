import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { isValidElement } from 'react';
export const LoginFooterItem = (_a) => {
    var { children = null, href = '#', target = '_blank' } = _a, props = __rest(_a, ["children", "href", "target"]);
    return isValidElement(children) ? (children) : (_jsx("a", Object.assign({ target: target, href: href }, props, { children: children })));
};
LoginFooterItem.displayName = 'LoginFooterItem';
//# sourceMappingURL=LoginFooterItem.js.map