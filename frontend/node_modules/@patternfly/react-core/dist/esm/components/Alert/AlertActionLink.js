import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { Button, ButtonVariant } from '../Button';
export const AlertActionLink = (_a) => {
    var { className = '', children } = _a, props = __rest(_a, ["className", "children"]);
    return (_jsx(Button, Object.assign({ variant: ButtonVariant.link, isInline: true, className: className }, props, { children: children })));
};
AlertActionLink.displayName = 'AlertActionLink';
//# sourceMappingURL=AlertActionLink.js.map