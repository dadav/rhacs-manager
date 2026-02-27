import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import { MenuGroup } from '../Menu';
export const SelectGroup = (_a) => {
    var { children, className, label } = _a, props = __rest(_a, ["children", "className", "label"]);
    return (_jsx(MenuGroup, Object.assign({ className: css(className), label: label }, props, { children: children })));
};
SelectGroup.displayName = 'SelectGroup';
//# sourceMappingURL=SelectGroup.js.map