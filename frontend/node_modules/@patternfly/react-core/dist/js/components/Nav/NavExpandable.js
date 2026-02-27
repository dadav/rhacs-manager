"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NavExpandable = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const nav_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Nav/nav"));
const react_styles_1 = require("@patternfly/react-styles");
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const util_1 = require("../../helpers/util");
const Nav_1 = require("./Nav");
const PageSidebar_1 = require("../Page/PageSidebar");
const helpers_1 = require("../../helpers");
class NavExpandable extends react_1.Component {
    constructor() {
        super(...arguments);
        this.id = this.props.id || (0, util_1.getUniqueId)();
        this.state = {
            expandedState: this.props.isExpanded,
            ouiaStateId: (0, helpers_1.getDefaultOUIAId)(NavExpandable.displayName)
        };
        this.onExpand = (event, onToggle) => {
            const { expandedState } = this.state;
            if (this.props.onExpand) {
                this.props.onExpand(event, !expandedState);
            }
            else {
                this.setState((prevState) => ({ expandedState: !prevState.expandedState }));
                const { groupId } = this.props;
                onToggle(event, groupId, !expandedState);
            }
        };
    }
    componentDidMount() {
        this.setState({ expandedState: this.props.isExpanded });
    }
    componentDidUpdate(prevProps) {
        if (this.props.isExpanded !== prevProps.isExpanded) {
            this.setState({ expandedState: this.props.isExpanded });
        }
    }
    render() {
        const _a = this.props, { title, srText, children, className, isActive, ouiaId, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        groupId, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        id, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        isExpanded, buttonProps, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onExpand } = _a, props = tslib_1.__rest(_a, ["title", "srText", "children", "className", "isActive", "ouiaId", "groupId", "id", "isExpanded", "buttonProps", "onExpand"]);
        const { expandedState, ouiaStateId } = this.state;
        return ((0, jsx_runtime_1.jsx)(Nav_1.NavContext.Consumer, { children: (context) => ((0, jsx_runtime_1.jsxs)("li", Object.assign({ className: (0, react_styles_1.css)(nav_1.default.navItem, expandedState && nav_1.default.modifiers.expanded, isActive && nav_1.default.modifiers.current, className) }, (0, helpers_1.getOUIAProps)(NavExpandable.displayName, ouiaId !== undefined ? ouiaId : ouiaStateId), props, { children: [(0, jsx_runtime_1.jsx)(PageSidebar_1.PageSidebarContext.Consumer, { children: ({ isSidebarOpen }) => ((0, jsx_runtime_1.jsxs)("button", Object.assign({ className: (0, react_styles_1.css)(nav_1.default.navLink), id: srText ? null : this.id, onClick: (event) => this.onExpand(event, context.onToggle), "aria-expanded": expandedState, tabIndex: isSidebarOpen ? null : -1 }, buttonProps, { children: [typeof title !== 'string' ? (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(`${nav_1.default.nav}__link-text`), children: title }) : title, (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(nav_1.default.navToggle), children: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(nav_1.default.navToggleIcon), children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }) })] }))) }), (0, jsx_runtime_1.jsxs)("section", Object.assign({ className: (0, react_styles_1.css)(nav_1.default.navSubnav), "aria-labelledby": this.id, hidden: expandedState ? null : true }, (!expandedState && { inert: '' }), { children: [srText && ((0, jsx_runtime_1.jsx)("h2", { className: "pf-v6-screen-reader", id: this.id, children: srText })), (0, jsx_runtime_1.jsx)("ul", { className: (0, react_styles_1.css)(nav_1.default.navList), role: "list", children: children })] }))] }))) }));
    }
}
exports.NavExpandable = NavExpandable;
NavExpandable.displayName = 'NavExpandable';
NavExpandable.defaultProps = {
    srText: '',
    isExpanded: false,
    children: '',
    className: '',
    groupId: null,
    isActive: false,
    id: ''
};
//# sourceMappingURL=NavExpandable.js.map