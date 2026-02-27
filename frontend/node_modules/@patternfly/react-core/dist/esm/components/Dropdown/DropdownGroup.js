import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import { MenuGroup } from '../Menu';
export const DropdownGroup = (_a) => {
    var { children, className, label, labelHeadingLevel = 'h1' } = _a, props = __rest(_a, ["children", "className", "label", "labelHeadingLevel"]);
    return (_jsx(MenuGroup, Object.assign({ className: css(className), label: label, labelHeadingLevel: labelHeadingLevel }, props, { children: children })));
};
DropdownGroup.displayName = 'DropdownGroup';
//# sourceMappingURL=DropdownGroup.js.map