import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { Component } from 'react';
import styles from '@patternfly/react-styles/css/components/MenuToggle/menu-toggle.mjs';
import { css } from '@patternfly/react-styles';
class MenuToggleAction extends Component {
    render() {
        const _a = this.props, { id, className, onClick, isDisabled, children } = _a, props = __rest(_a, ["id", "className", "onClick", "isDisabled", "children"]);
        return (_jsx("button", Object.assign({ id: id, className: css(styles.menuToggleButton, className), onClick: onClick, type: "button", disabled: isDisabled }, props, { children: children })));
    }
}
MenuToggleAction.displayName = 'MenuToggleAction';
MenuToggleAction.defaultProps = {
    className: '',
    isDisabled: false,
    onClick: () => { }
};
export { MenuToggleAction };
//# sourceMappingURL=MenuToggleAction.js.map