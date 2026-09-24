!function(){var e=("u">typeof globalThis?globalThis:"u">typeof self?self:"u">typeof window?window:"u">typeof global?global:{}).parcelRequire6955;(0,e.register)("jQkY9",function(s,o){Object.defineProperty(s.exports,"__esModule",{value:!0,configurable:!0}),Object.defineProperty(s.exports,"default",{get:function(){return p},set:void 0,enumerable:!0,configurable:!0});var r=e("btLMe");e("6vwxN");"use strict";var l=e("j6x3p"),i=e("9m866"),a=e("8ORPK"),n=e("5kpri"),t=e("bnENU");let c=({badgeKey:e,badgeLifecycleText:s,badgeVersion:o,lifecycleClass:n,lifecycleName:c,showLifecycleName:p,showVersion:d,hasMultipleLifecycles:u,popoverData:f,showPopover:x=!0,isInline:b=!1})=>{let[g,h]=(0,t.useState)(!1),[m,v]=(0,t.useState)(!1),[y,w]=(0,t.useState)(new Set),[j,N]=(0,t.useState)(!1),k=(0,i.useGeneratedHtmlId)({prefix:"appliesToPopover"}),I=(0,t.useRef)(null),L=(0,t.useRef)(null),_=(0,t.useRef)(null);(0,t.useEffect)(()=>{let e=()=>{let e=window.matchMedia("(pointer: coarse)").matches,s=window.matchMedia("(hover: none)").matches;N(e||s)};return e(),window.addEventListener("resize",e),()=>window.removeEventListener("resize",e)},[]);let C=f&&(f.productDescription||f.availabilityItems.length>0||f.additionalInfo||f.showVersionNote),E=(0,t.useCallback)(()=>{x&&C&&h(!0)},[x,C]),P=(0,t.useCallback)(()=>{m||h(!1)},[m]),M=(0,t.useCallback)(()=>{j&&x&&C&&(m?(v(!1),h(!1)):(v(!0),h(!0)))},[x,C,m,j]),S=(0,t.useCallback)((e,s)=>{s.stopPropagation(),w(s=>{let o=new Set(s);return o.has(e)?o.delete(e):o.add(e),o})},[]),T=(0,t.useCallback)(()=>{v(!1),h(!1)},[]),z=(0,t.useCallback)(()=>{_.current&&(clearTimeout(_.current),_.current=null),_.current=setTimeout(()=>{E()},250)},[E]),D=(0,t.useCallback)(()=>{_.current&&(clearTimeout(_.current),_.current=null),_.current=setTimeout(()=>{P()},150)},[P]);(0,t.useEffect)(()=>()=>{_.current&&clearTimeout(_.current)},[]),(0,t.useEffect)(()=>{if(!L.current||!g)return;let e=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting||(v(!1),h(!1))})},{threshold:0});return e.observe(L.current),()=>{e.disconnect()}},[g]),(0,t.useEffect)(()=>{g||w(new Set)},[g]);let $=x&&C&&j,O=(0,r.jsxs)("span",{ref:L,className:`applicable-info${x&&C?" applicable-info--clickable":""}${m?" applicable-info--pinned":""}`,onClick:M,onMouseEnter:z,onMouseLeave:D,role:$?"button":void 0,tabIndex:$?0:void 0,onKeyDown:e=>{$&&("Enter"===e.key||" "===e.key)&&(e.preventDefault(),M())},children:[(0,r.jsx)("span",{className:"applicable-name",children:e}),e&&(p||d||s)&&(0,r.jsx)("span",{className:"applicable-separator"}),(0,r.jsxs)("span",{className:`applicable-meta applicable-meta-${n}`,children:[p&&(0,r.jsx)("span",{className:`applicable-lifecycle applicable-lifecycle-${n}`,children:c}),d?(0,r.jsx)("span",{className:`applicable-version applicable-version-${n}`,children:o}):s,u&&(0,r.jsxs)("span",{className:"applicable-ellipsis",children:[(0,r.jsx)("span",{className:"applicable-ellipsis__dot"}),(0,r.jsx)("span",{className:"applicable-ellipsis__dot"}),(0,r.jsx)("span",{className:"applicable-ellipsis__dot"})]})]})]});return x&&C?(0,r.jsx)(l.EuiPopover,{id:k,button:O,isOpen:g,closePopover:T,panelPaddingSize:"none",anchorPosition:"downLeft",repositionOnScroll:!0,css:(0,a.css)`
                display: ${b?"inline-flex":"flex"};
                vertical-align: ${b?"bottom":"baseline"};
            `,panelProps:{onMouseEnter:z,onMouseLeave:D,css:(0,a.css)`
                    max-width: 420px;
                    z-index: 40 !important; /* Show below the main header if needed */

                    /* Remove all focus styling from panel */
                    &,
                    &:focus,
                    &:focus-visible,
                    &:focus-within {
                        outline: none !important;
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
                    }

                    .euiPopover__panelArrow {
                        display: none;
                    }
                `},children:(0,r.jsxs)("div",{ref:I,css:(0,a.css)`
                    padding: 16px;
                    font-size: 14px;
                    line-height: 1.5;
                    color: var(--color-grey-100, #1a1c21);
                `,children:[f?.productDescription&&(0,r.jsx)("p",{css:(0,a.css)`
                            margin: 0 0 16px 0;
                            color: var(--color-grey-80, #343741);

                            strong {
                                display: inline;
                                font-weight: 700;
                                color: var(--color-grey-100, #1a1c21);
                            }
                        `,dangerouslySetInnerHTML:{__html:f.productDescription}}),f&&f.availabilityItems.length>0&&(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)("p",{css:(0,a.css)`
                                margin: 0 0 4px 0;
                            `,children:(0,r.jsx)("strong",{css:(0,a.css)`
                                    display: inline;
                                    font-weight: 700;
                                    font-size: 15px;
                                    color: var(--color-grey-100, #1a1c21);
                                `,children:"Availability"})}),(0,r.jsx)("p",{css:(0,a.css)`
                                margin: 0 0 8px 0;
                                color: var(--color-grey-70, #535966);
                                font-size: 13px;
                            `}),f.availabilityItems.map((e,s)=>{let o;return o=y.has(s),e.lifecycleDescription?(0,r.jsxs)("div",{css:(0,a.css)`
                        margin: 0 0 4px 0;
                        border: none;
                        background: none;
                    `,children:[(0,r.jsx)("div",{onClick:e=>S(s,e),css:(0,a.css)`
                            display: flex;
                            align-items: center;
                            cursor: pointer;
                            padding: 4px 0;
                            color: var(--color-blue-elastic, #0077cc);
                            font-weight: 500;

                            &::before {
                                content: '';
                                display: inline-block;
                                width: 6px;
                                height: 6px;
                                border-right: 2px solid currentColor;
                                border-bottom: 2px solid currentColor;
                                transform: ${o?"rotate(45deg)":"rotate(-45deg)"};
                                margin-right: 8px;
                                transition: transform 0.15s ease;
                            }

                            &:hover {
                                color: var(--color-blue-hover, #005fa3);
                            }
                        `,children:(0,r.jsx)("span",{css:(0,a.css)`
                                flex: 1;
                            `,children:e.text})}),o&&(0,r.jsx)("p",{css:(0,a.css)`
                                margin: 4px 0 8px 16px;
                                padding: 8px 12px;
                                background: var(--color-grey-5, #f5f7fa);
                                border-radius: 4px;
                                font-size: 13px;
                                color: var(--color-grey-80, #343741);
                                line-height: 1.5;
                            `,children:e.lifecycleDescription})]},s):(0,r.jsx)("p",{css:(0,a.css)`
                    margin: 0 0 4px 0;
                    padding: 4px 0 4px 16px;
                    color: var(--color-grey-80, #343741);
                `,children:e.text},s)})]}),f?.additionalInfo&&(0,r.jsx)("p",{css:(0,a.css)`
                            margin: 12px 0 0 0;
                            padding-top: 12px;
                            border-top: 1px solid var(--color-grey-15, #e0e5ee);
                            color: var(--color-grey-70, #535966);
                            font-size: 13px;
                        `,children:f.additionalInfo}),f?.showVersionNote&&f?.versionNote&&(0,r.jsxs)("p",{css:(0,a.css)`
                            display: flex;
                            align-items: flex-start;
                            gap: 8px;
                            margin: 12px 0 0 0;
                            padding: 8px 12px;
                            background: var(--color-grey-5, #f5f7fa);
                            border-radius: 4px;
                            font-size: 12px;
                            color: var(--color-grey-70, #535966);
                            line-height: 1.5;
                        `,children:[(0,r.jsx)("span",{css:(0,a.css)`
                                flex-shrink: 0;
                                color: var(--color-blue-elastic, #0077cc);
                                font-size: 14px;
                            `,children:"ⓘ"}),(0,r.jsx)("span",{css:(0,a.css)`
                                a {
                                    color: var(--color-blue-elastic, #0077cc);
                                    text-decoration: none;
                                    &:hover {
                                        text-decoration: underline;
                                    }
                                }
                            `,dangerouslySetInnerHTML:{__html:f.versionNote}})]})]})}):O};customElements.define("applies-to-popover",(0,n.default)(c,{props:{badgeKey:"string",badgeLifecycleText:"string",badgeVersion:"string",lifecycleClass:"string",lifecycleName:"string",showLifecycleName:"boolean",showVersion:"boolean",hasMultipleLifecycles:"boolean",popoverData:"json",showPopover:"boolean",isInline:"boolean"}}));var p=c})}();
//# sourceMappingURL=AppliesToPopover.5905f0fa.js.map
