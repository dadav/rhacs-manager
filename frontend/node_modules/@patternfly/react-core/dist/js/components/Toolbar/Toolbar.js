"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Toolbar = exports.ToolbarColorVariant = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const toolbar_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Toolbar/toolbar"));
const GenerateId_1 = require("../../helpers/GenerateId/GenerateId");
const react_styles_1 = require("@patternfly/react-styles");
const ToolbarUtils_1 = require("./ToolbarUtils");
const ToolbarLabelGroupContent_1 = require("./ToolbarLabelGroupContent");
const util_1 = require("../../helpers/util");
const helpers_1 = require("../../helpers");
const PageContext_1 = require("../Page/PageContext");
var ToolbarColorVariant;
(function (ToolbarColorVariant) {
    ToolbarColorVariant["default"] = "default";
    ToolbarColorVariant["primary"] = "primary";
    ToolbarColorVariant["secondary"] = "secondary";
    ToolbarColorVariant["noBackground"] = "no-background";
})(ToolbarColorVariant || (exports.ToolbarColorVariant = ToolbarColorVariant = {}));
class Toolbar extends react_1.Component {
    constructor() {
        super(...arguments);
        this.labelGroupContentRef = (0, react_1.createRef)();
        this.staticFilterInfo = {};
        this.hasNoPadding = false;
        this.state = {
            isManagedToggleExpanded: false,
            filterInfo: {},
            windowWidth: util_1.canUseDOM ? window.innerWidth : 1200,
            ouiaStateId: (0, helpers_1.getDefaultOUIAId)(Toolbar.displayName)
        };
        this.isToggleManaged = () => !(this.props.isExpanded || !!this.props.toggleIsExpanded);
        this.toggleIsExpanded = () => {
            this.setState((prevState) => ({
                isManagedToggleExpanded: !prevState.isManagedToggleExpanded
            }));
        };
        this.closeExpandableContent = (e) => {
            if (e.target.innerWidth !== this.state.windowWidth) {
                this.setState(() => ({
                    isManagedToggleExpanded: false,
                    windowWidth: e.target.innerWidth
                }));
            }
        };
        this.updateNumberFilters = (categoryName, numberOfFilters) => {
            const filterInfoToUpdate = Object.assign({}, this.staticFilterInfo);
            if (!filterInfoToUpdate.hasOwnProperty(categoryName) || filterInfoToUpdate[categoryName] !== numberOfFilters) {
                filterInfoToUpdate[categoryName] = numberOfFilters;
                this.staticFilterInfo = filterInfoToUpdate;
                this.setState({ filterInfo: filterInfoToUpdate });
            }
        };
        this.getNumberOfFilters = () => Object.values(this.state.filterInfo).reduce((acc, cur) => acc + cur, 0);
        this.renderToolbar = (randomId) => {
            const _a = this.props, { hasNoPadding, clearAllFilters, clearFiltersButtonText, collapseListedFiltersBreakpoint, isExpanded: isExpandedProp, toggleIsExpanded, className, children, isFullHeight, isStatic, inset, isSticky, ouiaId, numberOfFiltersText, customLabelGroupContent, colorVariant = ToolbarColorVariant.default } = _a, props = tslib_1.__rest(_a, ["hasNoPadding", "clearAllFilters", "clearFiltersButtonText", "collapseListedFiltersBreakpoint", "isExpanded", "toggleIsExpanded", "className", "children", "isFullHeight", "isStatic", "inset", "isSticky", "ouiaId", "numberOfFiltersText", "customLabelGroupContent", "colorVariant"]);
            const { isManagedToggleExpanded } = this.state;
            const isToggleManaged = this.isToggleManaged();
            const isExpanded = isToggleManaged ? isManagedToggleExpanded : isExpandedProp;
            const numberOfFilters = this.getNumberOfFilters();
            const showClearFiltersButton = numberOfFilters > 0;
            return ((0, jsx_runtime_1.jsx)(PageContext_1.PageContext.Consumer, { children: ({ width, getBreakpoint }) => ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(toolbar_1.default.toolbar, hasNoPadding && toolbar_1.default.modifiers.noPadding, isFullHeight && toolbar_1.default.modifiers.fullHeight, isStatic && toolbar_1.default.modifiers.static, isSticky && toolbar_1.default.modifiers.sticky, (0, util_1.formatBreakpointMods)(inset, toolbar_1.default, '', getBreakpoint(width)), colorVariant === 'primary' && toolbar_1.default.modifiers.primary, colorVariant === 'secondary' && toolbar_1.default.modifiers.secondary, colorVariant === 'no-background' && toolbar_1.default.modifiers.noBackground, className), id: randomId }, (0, helpers_1.getOUIAProps)(Toolbar.displayName, ouiaId !== undefined ? ouiaId : this.state.ouiaStateId), props, { children: (0, jsx_runtime_1.jsxs)(ToolbarUtils_1.ToolbarContext.Provider, { value: {
                            isExpanded,
                            toggleIsExpanded: isToggleManaged ? this.toggleIsExpanded : toggleIsExpanded,
                            labelGroupContentRef: this.labelGroupContentRef,
                            updateNumberFilters: this.updateNumberFilters,
                            numberOfFilters,
                            clearAllFilters,
                            clearFiltersButtonText,
                            showClearFiltersButton,
                            toolbarId: randomId,
                            customLabelGroupContent
                        }, children: [children, (0, jsx_runtime_1.jsx)(ToolbarLabelGroupContent_1.ToolbarLabelGroupContent, { isExpanded: isExpanded, labelGroupContentRef: this.labelGroupContentRef, clearAllFilters: clearAllFilters, showClearFiltersButton: showClearFiltersButton, clearFiltersButtonText: clearFiltersButtonText, numberOfFilters: numberOfFilters, numberOfFiltersText: numberOfFiltersText, collapseListedFiltersBreakpoint: collapseListedFiltersBreakpoint, customLabelGroupContent: customLabelGroupContent })] }) }))) }));
        };
    }
    componentDidMount() {
        if (this.isToggleManaged() && util_1.canUseDOM) {
            window.addEventListener('resize', this.closeExpandableContent);
        }
    }
    componentWillUnmount() {
        if (this.isToggleManaged() && util_1.canUseDOM) {
            window.removeEventListener('resize', this.closeExpandableContent);
        }
    }
    render() {
        return this.props.id ? (this.renderToolbar(this.props.id)) : ((0, jsx_runtime_1.jsx)(GenerateId_1.GenerateId, { children: (randomId) => this.renderToolbar(randomId) }));
    }
}
exports.Toolbar = Toolbar;
Toolbar.displayName = 'Toolbar';
//# sourceMappingURL=Toolbar.js.map