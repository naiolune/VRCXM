<template>
    <div class="data-table-wrapper">
        <el-table
            ref="tableRef"
            v-loading="loading"
            :data="paginatedData"
            v-bind="mergedTableProps"
            default-sort-prop="created_at"
            default-sort-order="descending"
            @sort-change="handleSortChange"
            @selection-change="handleSelectionChange"
            @row-click="handleRowClick">
            <template #empty>
                <div class="table-empty-state">
                    <div class="table-empty-icon">
                        <i class="ri-database-2-line"></i>
                    </div>
                    <p class="table-empty-text">No data available</p>
                </div>
            </template>
            <slot></slot>
        </el-table>

        <div v-if="showPagination" class="pagination-wrapper">
            <el-pagination
                :current-page="internalCurrentPage"
                :page-size="internalPageSize"
                :total="filteredData.length"
                v-bind="mergedPaginationProps"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange" />
        </div>
    </div>
</template>

<script>
    import { computed, ref, toRefs, watch } from 'vue';

    import { useAppearanceSettingsStore } from '../stores';

    export default {
        name: 'DataTable',
        props: {
            data: {
                type: Array,
                default: () => []
            },
            tableProps: {
                type: Object,
                default: () => ({})
            },
            paginationProps: {
                type: Object,
                default: () => ({})
            },
            currentPage: {
                type: Number,
                default: 1
            },
            pageSize: {
                type: Number,
                default: 20
            },
            pageSizeLinked: {
                type: Boolean,
                default: false
            },
            filters: {
                type: [Array, Object],
                default: () => []
            },
            loading: {
                type: Boolean,
                default: false
            },
            layout: {
                type: String,
                default: 'table, pagination'
            }
        },
        emits: [
            'update:currentPage',
            'update:pageSize',
            'update:tableProps',
            'size-change',
            'current-change',
            'selection-change',
            'row-click',
            'filtered-data',
            'sort-change'
        ],
        setup(props, { emit }) {
            const appearanceSettingsStore = useAppearanceSettingsStore();
            const { data, currentPage, pageSize, tableProps, paginationProps, filters } = toRefs(props);

            const internalCurrentPage = ref(currentPage.value);
            const internalPageSize = ref(pageSize.value);
            const sortData = ref({
                prop: props.tableProps.defaultSort?.prop || 'created_at',
                order: props.tableProps.defaultSort?.order || 'descending'
            });

            const showPagination = computed(() => {
                return props.layout.includes('pagination');
            });

            const mergedTableProps = computed(() => ({
                stripe: true,
                ...tableProps.value
            }));

            const mergedPaginationProps = computed(() => ({
                layout: 'sizes, prev, pager, next, total',
                pageSizes: [10, 15, 20, 25, 50, 100],
                small: true,
                ...paginationProps.value
            }));

            const applyFilter = function (row, filter) {
                if (Array.isArray(filter.prop)) {
                    return filter.prop.some((propItem) => applyFilter(row, { prop: propItem, value: filter.value }));
                }

                const cellValue = row[filter.prop];
                if (cellValue === undefined || cellValue === null) return false;

                if (Array.isArray(filter.value)) {
                    // assume filter dropdown multi select
                    return filter.value.some((val) => String(cellValue).toLowerCase() === String(val).toLowerCase());
                } else {
                    return String(cellValue).toLowerCase().includes(String(filter.value).toLowerCase());
                }
            };

            const filteredData = computed(() => {
                let result = [...data.value];
                
                console.log('[DataTable] filteredData computed', {
                    inputDataLength: data.value?.length || 0,
                    inputDataType: Array.isArray(data.value) ? 'array' : typeof data.value,
                    inputDataSample: data.value?.slice ? data.value.slice(0, 2) : 'not an array',
                    filtersLength: filters.value?.length || 0,
                    resultLength: result.length,
                    resultSample: result.slice ? result.slice(0, 2) : 'not an array'
                });

                if (filters.value && Array.isArray(filters.value) && filters.value.length > 0) {
                    filters.value.forEach((filter) => {
                        if (!filter.value) {
                            return;
                        }
                        if (filter.filterFn) {
                            result = result.filter((row) => filter.filterFn(row, filter));
                        } else if (!Array.isArray(filter.value) || filter.value.length > 0) {
                            result = result.filter((row) => applyFilter(row, filter));
                        }
                    });
                }

                if (sortData.value.prop && sortData.value.order) {
                    const { prop, order } = sortData.value;
                    result.sort((a, b) => {
                        const aVal = a[prop];
                        const bVal = b[prop];
                        let comparison = 0;

                        if (aVal == null && bVal == null) return 0;
                        if (aVal == null) return 1;
                        if (bVal == null) return -1;

                        // Handle date strings (ISO format)
                        if (prop === 'created_at' && typeof aVal === 'string' && typeof bVal === 'string') {
                            const aTime = new Date(aVal).getTime();
                            const bTime = new Date(bVal).getTime();
                            comparison = aTime - bTime;
                        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
                            comparison = aVal - bVal;
                        } else if (aVal instanceof Date && bVal instanceof Date) {
                            comparison = aVal.getTime() - bVal.getTime();
                        } else {
                            const aStr = String(aVal).toLowerCase();
                            const bStr = String(bVal).toLowerCase();
                            if (aStr > bStr) comparison = 1;
                            else if (aStr < bStr) comparison = -1;
                        }

                        return order === 'descending' ? -comparison : comparison;
                    });
                }

                emit('filtered-data', result);
                return result;
            });

            const paginatedData = computed(() => {
                console.log('[DataTable] paginatedData computed', {
                    showPagination: showPagination.value,
                    filteredDataLength: filteredData.value?.length || 0,
                    filteredDataType: Array.isArray(filteredData.value) ? 'array' : typeof filteredData.value,
                    currentPage: internalCurrentPage.value,
                    pageSize: internalPageSize.value
                });
                
                if (!showPagination.value) {
                    console.log('[DataTable] No pagination, returning all filteredData:', filteredData.value.length);
                    return filteredData.value;
                }

                const start = (internalCurrentPage.value - 1) * internalPageSize.value;
                const end = start + internalPageSize.value;
                const paginated = filteredData.value.slice(start, end);
                console.log('[DataTable] Paginated data', {
                    start,
                    end,
                    paginatedLength: paginated.length,
                    paginatedType: Array.isArray(paginated) ? 'array' : typeof paginated,
                    firstFew: paginated.slice(0, 3),
                    firstItemKeys: paginated[0] ? Object.keys(paginated[0]) : 'no items'
                });
                return paginated;
            });

            const handleSortChange = ({ prop, order }) => {
                if (props.tableProps.defaultSort) {
                    const { tableProps } = props;
                    tableProps.defaultSort.prop = prop;
                    tableProps.defaultSort.order = order;
                    emit('update:tableProps', tableProps);
                }
                sortData.value = { prop, order };
                emit('sort-change', sortData.value);
            };

            const handleSelectionChange = (selection) => {
                emit('selection-change', selection);
            };

            const handleRowClick = (row, column, event) => {
                emit('row-click', row, column, event);
            };

            const handleSizeChange = (size) => {
                if (props.pageSizeLinked) {
                    appearanceSettingsStore.setTablePageSize(size);
                }
                internalPageSize.value = size;
            };

            const handleCurrentChange = (page) => {
                internalCurrentPage.value = page;
            };

            watch(currentPage, (newVal) => {
                internalCurrentPage.value = newVal;
            });

            watch(pageSize, (newVal) => {
                internalPageSize.value = newVal;
            });

            watch(
                () => props.tableProps.defaultSort,
                (newSort) => {
                    if (newSort) {
                        sortData.value = {
                            prop: newSort.prop,
                            order: newSort.order
                        };
                    }
                },
                { immediate: true }
            );

            return {
                internalCurrentPage,
                internalPageSize,
                showPagination,
                mergedTableProps,
                mergedPaginationProps,
                filteredData,
                paginatedData,
                data,
                handleSortChange,
                handleSelectionChange,
                handleRowClick,
                handleSizeChange,
                handleCurrentChange
            };
        }
    };
</script>

<style scoped lang="scss">
    .data-table-wrapper {
        margin: 0;
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        overflow: hidden;
    }

    .el-table {
        flex: 1;
        min-height: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        background: rgba(255, 255, 255, 0.02) !important;
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
    }
    
    .el-table__header-wrapper {
        flex-shrink: 0;
    }

    .el-table__body-wrapper {
        flex: 1;
        min-height: 0;
        overflow-y: auto !important;
        overflow-x: auto !important;
        
        // Modern scrollbar
        &::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        
        &::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 10px;
        }
        
        &::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            border: 2px solid transparent;
            background-clip: padding-box;
            
            &:hover {
                background: rgba(255, 255, 255, 0.15);
                background-clip: padding-box;
            }
        }
    }

    .pagination-wrapper {
        margin-top: 12px;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-shrink: 0;
        padding: 8px 0;
    }

    .table-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
    }

    .table-empty-icon {
        font-size: 48px;
        color: rgba(255, 255, 255, 0.2);
        margin-bottom: 16px;
    }

    .table-empty-text {
        color: rgba(255, 255, 255, 0.5);
        font-size: 14px;
        font-weight: 500;
        margin: 0;
    }
</style>
