import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { getOUIAProps } from '../../helpers';
export const TabButton = (_a) => {
    var { children, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tabContentRef, ouiaId, parentInnerRef, ouiaSafe } = _a, props = __rest(_a, ["children", "tabContentRef", "ouiaId", "parentInnerRef", "ouiaSafe"]);
    const Component = (props.href ? 'a' : 'button');
    return (_jsx(Component, Object.assign({}, (!props.href && { type: 'button' }), { ref: parentInnerRef }, getOUIAProps(TabButton.displayName, ouiaId, ouiaSafe), props, { children: children })));
};
TabButton.displayName = 'TabButton';
//# sourceMappingURL=TabButton.js.map