"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpandableSection = exports.ExpandableSectionVariant = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const expandable_section_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ExpandableSection/expandable-section"));
const react_styles_1 = require("@patternfly/react-styles");
const c_expandable_section_m_truncate__content_LineClamp_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_expandable_section_m_truncate__content_LineClamp'));
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const util_1 = require("../../helpers/util");
const resizeObserver_1 = require("../../helpers/resizeObserver");
const Button_1 = require("../Button");
var ExpandableSectionVariant;
(function (ExpandableSectionVariant) {
    ExpandableSectionVariant["default"] = "default";
    ExpandableSectionVariant["truncate"] = "truncate";
})(ExpandableSectionVariant || (exports.ExpandableSectionVariant = ExpandableSectionVariant = {}));
const directionClassMap = {
    up: expandable_section_1.default.modifiers.expandTop,
    down: expandable_section_1.default.modifiers.expandBottom
};
const setLineClamp = (lines, element) => {
    if (!element || lines < 1) {
        return;
    }
    element.style.setProperty(c_expandable_section_m_truncate__content_LineClamp_1.default.name, lines.toString());
};
class ExpandableSection extends react_1.Component {
    constructor(props) {
        super(props);
        this.expandableContentRef = (0, react_1.createRef)();
        this.observer = () => { };
        this.checkToggleVisibility = () => {
            var _a;
            if ((_a = this.expandableContentRef) === null || _a === void 0 ? void 0 : _a.current) {
                const maxLines = this.props.truncateMaxLines || parseInt(c_expandable_section_m_truncate__content_LineClamp_1.default.value);
                const totalLines = this.expandableContentRef.current.scrollHeight /
                    parseInt(getComputedStyle(this.expandableContentRef.current).lineHeight);
                this.setState({
                    hasToggle: totalLines > maxLines
                });
            }
        };
        this.resize = () => {
            if (this.expandableContentRef.current) {
                const { offsetWidth } = this.expandableContentRef.current;
                if (this.state.previousWidth !== offsetWidth) {
                    this.setState({ previousWidth: offsetWidth });
                    this.checkToggleVisibility();
                }
            }
        };
        this.handleResize = (0, util_1.debounce)(this.resize, 250);
        this.state = {
            isExpanded: props.isExpanded,
            hasToggle: true,
            previousWidth: undefined
        };
    }
    calculateToggleText(toggleText, toggleTextExpanded, toggleTextCollapsed, propOrStateIsExpanded) {
        if (propOrStateIsExpanded && toggleTextExpanded !== '') {
            return toggleTextExpanded;
        }
        if (!propOrStateIsExpanded && toggleTextCollapsed !== '') {
            return toggleTextCollapsed;
        }
        return toggleText;
    }
    componentDidMount() {
        if (this.props.variant === ExpandableSectionVariant.truncate) {
            const expandableContent = this.expandableContentRef.current;
            this.setState({ previousWidth: expandableContent.offsetWidth });
            this.observer = (0, resizeObserver_1.getResizeObserver)(expandableContent, this.handleResize, false);
            if (this.props.truncateMaxLines) {
                setLineClamp(this.props.truncateMaxLines, expandableContent);
            }
            this.checkToggleVisibility();
        }
    }
    componentDidUpdate(prevProps) {
        if (this.props.variant === ExpandableSectionVariant.truncate &&
            (prevProps.truncateMaxLines !== this.props.truncateMaxLines || prevProps.children !== this.props.children)) {
            const expandableContent = this.expandableContentRef.current;
            setLineClamp(this.props.truncateMaxLines, expandableContent);
            this.checkToggleVisibility();
        }
    }
    componentWillUnmount() {
        if (this.props.variant === ExpandableSectionVariant.truncate) {
            this.observer();
        }
    }
    render() {
        const _a = this.props, { onToggle: onToggleProp, className, toggleText, toggleTextExpanded, toggleTextCollapsed, toggleContent, children, isExpanded, isDetached, displaySize, isWidthLimited, isIndented, contentId, toggleId, variant, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        truncateMaxLines, direction } = _a, props = tslib_1.__rest(_a, ["onToggle", "className", "toggleText", "toggleTextExpanded", "toggleTextCollapsed", "toggleContent", "children", "isExpanded", "isDetached", "displaySize", "isWidthLimited", "isIndented", "contentId", "toggleId", "variant", "truncateMaxLines", "direction"]);
        if (isDetached && !toggleId) {
            /* eslint-disable no-console */
            console.warn('ExpandableSection: The toggleId value must be passed in and must match the toggleId of the ExpandableSectionToggle.');
        }
        let onToggle = onToggleProp;
        let propOrStateIsExpanded = isExpanded;
        const uniqueContentId = contentId || (0, util_1.getUniqueId)('expandable-section-content');
        const uniqueToggleId = toggleId || (0, util_1.getUniqueId)('expandable-section-toggle');
        // uncontrolled
        if (isExpanded === undefined) {
            propOrStateIsExpanded = this.state.isExpanded;
            onToggle = (event, isOpen) => {
                this.setState({ isExpanded: isOpen }, () => onToggleProp(event, this.state.isExpanded));
            };
        }
        const computedToggleText = this.calculateToggleText(toggleText, toggleTextExpanded, toggleTextCollapsed, propOrStateIsExpanded);
        const expandableToggle = !isDetached && ((0, jsx_runtime_1.jsx)("div", { className: `${expandable_section_1.default.expandableSection}__toggle`, children: (0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ variant: "link" }, (variant === ExpandableSectionVariant.truncate && { isInline: true }), { "aria-expanded": propOrStateIsExpanded, "aria-controls": uniqueContentId, id: uniqueToggleId, onClick: (event) => onToggle(event, !propOrStateIsExpanded) }, (variant !== ExpandableSectionVariant.truncate && {
                icon: ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(expandable_section_1.default.expandableSectionToggleIcon), children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }))
            }), { children: toggleContent || computedToggleText })) }));
        return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(expandable_section_1.default.expandableSection, propOrStateIsExpanded && expandable_section_1.default.modifiers.expanded, displaySize === 'lg' && expandable_section_1.default.modifiers.displayLg, isWidthLimited && expandable_section_1.default.modifiers.limitWidth, isIndented && expandable_section_1.default.modifiers.indented, isDetached && direction && directionClassMap[direction], isDetached && direction && 'pf-m-detached', variant === ExpandableSectionVariant.truncate && expandable_section_1.default.modifiers.truncate, className) }, props, { children: [variant === ExpandableSectionVariant.default && expandableToggle, (0, jsx_runtime_1.jsx)("div", { ref: this.expandableContentRef, className: (0, react_styles_1.css)(expandable_section_1.default.expandableSectionContent), hidden: variant !== ExpandableSectionVariant.truncate && !propOrStateIsExpanded, id: uniqueContentId, "aria-labelledby": uniqueToggleId, role: "region", children: children }), variant === ExpandableSectionVariant.truncate && this.state.hasToggle && expandableToggle] })));
    }
}
exports.ExpandableSection = ExpandableSection;
ExpandableSection.displayName = 'ExpandableSection';
ExpandableSection.defaultProps = {
    className: '',
    toggleText: '',
    toggleTextExpanded: '',
    toggleTextCollapsed: '',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onToggle: (event, isExpanded) => undefined,
    isDetached: false,
    displaySize: 'default',
    isWidthLimited: false,
    isIndented: false,
    variant: 'default'
};
//# sourceMappingURL=ExpandableSection.js.map