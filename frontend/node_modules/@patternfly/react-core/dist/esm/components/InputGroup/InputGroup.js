import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useRef } from 'react';
import styles from '@patternfly/react-styles/css/components/InputGroup/input-group.mjs';
import { css } from '@patternfly/react-styles';
export const InputGroupBase = (_a) => {
    var { className, children, innerRef } = _a, props = __rest(_a, ["className", "children", "innerRef"]);
    const ref = useRef(null);
    const inputGroupRef = innerRef || ref;
    return (_jsx("div", Object.assign({ ref: inputGroupRef, className: css(styles.inputGroup, className) }, props, { children: children })));
};
InputGroupBase.displayName = 'InputGroupBase';
export const InputGroup = forwardRef((props, ref) => (_jsx(InputGroupBase, Object.assign({ innerRef: ref }, props))));
InputGroup.displayName = 'InputGroup';
//# sourceMappingURL=InputGroup.js.map