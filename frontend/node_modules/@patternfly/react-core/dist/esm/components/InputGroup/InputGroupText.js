import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/InputGroup/input-group.mjs';
import { css } from '@patternfly/react-styles';
import { InputGroupItem } from './InputGroupItem';
export const InputGroupText = (_a) => {
    var { className, component = 'span', children, isPlain, isDisabled } = _a, props = __rest(_a, ["className", "component", "children", "isPlain", "isDisabled"]);
    const Component = component;
    return (_jsx(InputGroupItem, { isPlain: isPlain, isBox: true, isDisabled: isDisabled, children: _jsx(Component, Object.assign({ className: css(styles.inputGroupText, className) }, props, { children: children })) }));
};
InputGroupText.displayName = 'InputGroupText';
//# sourceMappingURL=InputGroupText.js.map