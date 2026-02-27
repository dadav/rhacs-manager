"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuToggleAction = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const menu_toggle_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/MenuToggle/menu-toggle"));
const react_styles_1 = require("@patternfly/react-styles");
class MenuToggleAction extends react_1.Component {
    render() {
        const _a = this.props, { id, className, onClick, isDisabled, children } = _a, props = tslib_1.__rest(_a, ["id", "className", "onClick", "isDisabled", "children"]);
        return ((0, jsx_runtime_1.jsx)("button", Object.assign({ id: id, className: (0, react_styles_1.css)(menu_toggle_1.default.menuToggleButton, className), onClick: onClick, type: "button", disabled: isDisabled }, props, { children: children })));
    }
}
exports.MenuToggleAction = MenuToggleAction;
MenuToggleAction.displayName = 'MenuToggleAction';
MenuToggleAction.defaultProps = {
    className: '',
    isDisabled: false,
    onClick: () => { }
};
//# sourceMappingURL=MenuToggleAction.js.map