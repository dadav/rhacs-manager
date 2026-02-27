"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nav = exports.NavContext = exports.navContextDefaults = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const nav_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Nav/nav"));
const react_styles_1 = require("@patternfly/react-styles");
const helpers_1 = require("../../helpers");
exports.navContextDefaults = {};
exports.NavContext = (0, react_1.createContext)(exports.navContextDefaults);
class Nav extends react_1.Component {
    constructor() {
        super(...arguments);
        this.state = {
            isScrollable: false,
            ouiaStateId: (0, helpers_1.getDefaultOUIAId)(Nav.displayName, this.props.variant),
            flyoutRef: null
        };
        this.navRef = (0, react_1.createRef)();
    }
    // Callback from NavItem
    onSelect(event, groupId, itemId, to, preventDefault, onClick) {
        if (preventDefault) {
            event.preventDefault();
        }
        this.props.onSelect(event, { groupId, itemId, to });
        if (onClick) {
            onClick(event, itemId, groupId, to);
        }
    }
    // Callback from NavExpandable
    onToggle(event, groupId, toggleValue) {
        this.props.onToggle(event, {
            groupId,
            isExpanded: toggleValue
        });
    }
    render() {
        const _a = this.props, { 'aria-label': ariaLabel, children, className, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onSelect, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onToggle, ouiaId, ouiaSafe, variant } = _a, props = tslib_1.__rest(_a, ['aria-label', "children", "className", "onSelect", "onToggle", "ouiaId", "ouiaSafe", "variant"]);
        const isHorizontal = ['horizontal', 'horizontal-subnav'].includes(variant);
        return ((0, jsx_runtime_1.jsx)(exports.NavContext.Provider, { value: {
                onSelect: (event, groupId, itemId, to, preventDefault, onClick) => this.onSelect(event, groupId, itemId, to, preventDefault, onClick),
                onToggle: (event, groupId, expanded) => this.onToggle(event, groupId, expanded),
                updateIsScrollable: (isScrollable) => this.setState({ isScrollable }),
                isHorizontal: ['horizontal', 'horizontal-subnav'].includes(variant),
                flyoutRef: this.state.flyoutRef,
                setFlyoutRef: (flyoutRef) => this.setState({ flyoutRef }),
                navRef: this.navRef
            }, children: (0, jsx_runtime_1.jsx)("nav", Object.assign({ className: (0, react_styles_1.css)(nav_1.default.nav, isHorizontal && nav_1.default.modifiers.horizontal, variant === 'horizontal-subnav' && nav_1.default.modifiers.subnav, this.state.isScrollable && nav_1.default.modifiers.scrollable, className), "aria-label": ariaLabel || (variant === 'horizontal-subnav' ? 'Local' : 'Global'), ref: this.navRef }, (0, helpers_1.getOUIAProps)(Nav.displayName, ouiaId !== undefined ? ouiaId : this.state.ouiaStateId, ouiaSafe), props, { children: children })) }));
    }
}
exports.Nav = Nav;
Nav.displayName = 'Nav';
Nav.defaultProps = {
    onSelect: () => undefined,
    onToggle: () => undefined,
    ouiaSafe: true
};
//# sourceMappingURL=Nav.js.map