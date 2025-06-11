'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import jsPDF from 'jspdf';
// import autoTable, { RowInput } from 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import { MoreHorizontal, ListFilter, PlusCircle, Store } from "lucide-react"
import { formatCurrency } from '@/lib/utils'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Shared/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/Shared/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Shared/ui/table"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { Search } from 'lucide-react'
import Pagination from "@/components/Shared/ui/pagination"
import { EmptyState } from '../Empty/EmptyState'
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"
import { toast } from '@/hooks/use-toast'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem
} from "@/components/ui/command"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { Label } from "@/components/Shared/ui/label"
import AxiosClient from '@/lib/axiosClient';
import LoadingIndicator from '@/components/Shared/ui/LoadingIndicator';
import { Order } from '@/types/order';

interface OrderListProps {
  onOrderClick: (orderId: string) => void;
  onAddOrder: () => void;
}

// Non-hook version of formatCurrency for export functionality
const formatCurrencyForExport = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export function OrderList({ onOrderClick, onAddOrder }: OrderListProps) {
  const { user, business, availableShops,currentShop } = useAuthLayout();
  const [orders, setOrders] = useState<Order[]>([]);
  // const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterValue, setFilterValue] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [shopId, setShopId] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  const ITEMS_PER_PAGE = 10;

  const fetchOrders = async () => {
    setLoading(true)
    // let url = "/orders/shop/"+ (shopId || currentShop?.id || business?.shops?.[0]?.id) + "?page=" + currentPage + "&itemsPerPage=" + itemsPerPage;
    let url = "/orders/shop/"+ currentShop?.id;
    AxiosClient.get(url).then((response) => {
      const { success, data } = response.data
      if (success && data?.orders) {
        setOrders(data.orders)
        // setFilteredOrders(data.orders)
      }
    }).catch((err: any) => {
      let message = 'Error loading orders';
      if(err && err.message === 'Network Error') {
        message = process.env.NEXT_PUBLIC_ERROR_CONNECTION as string;
      }
      toast({ title: "Error", description: message, variant: "destructive"});
    }).finally(() => {
      setLoading(false)
    })
  };

  useEffect(() => {
    if (business?.id && user?.id) {
      fetchOrders();
    }
  }, [business, user, currentShop]);

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase().trim();

    // Search term matching
    const matchesSearch = searchLower === '' ? true : (
      order.id?.toLowerCase().includes(searchLower) ||
      order.customer?.name?.toLowerCase().includes(searchLower) ||
      order.deliveryStatus?.toLowerCase().includes(searchLower) ||
      formatCurrency(order.netAmount).toLowerCase().includes(searchLower)
    );

    // Delivery status filter
    const matchesFilter = filterValue === 'all' || order.deliveryStatus === filterValue;

    // Date range filter (assumes order.createdAt is a string in ISO or "YYYY-MM-DD HH:mm:ss" format)
    const orderDate = new Date(order.createdAt);
    const matchesDate =
      (!startDate || orderDate >= new Date(startDate)) &&
      (!endDate || orderDate <= new Date(endDate));

    return matchesSearch && matchesFilter && matchesDate;
  });

  // useEffect(() => {
  //   setFilteredOrders(filteredOrders);
  //   setCurrentPage(1);
  // }, [orders, filterValue, searchTerm, startDate, endDate]);

  const totalFilteredItems = filteredOrders.length;
  const totalPages = Math.ceil(totalFilteredItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPageItems = filteredOrders.slice(startIndex, endIndex);

  const handleViewDetails = async (orderId: string) => {
    if (!orderId) {
      console.error('Order ID is required to view details');
      return;
    }
    onOrderClick(orderId);
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      // Check if orders data exists
      if (!orders || orders.length === 0) {
        toast({
          title: "Export Failed",
          description: "No data available to export",
          variant: "destructive",
        });
        return;
      }

      const currentShopId = shopId || business?.shops?.[0]?.id;
      const currentShop = business?.shops?.find(shop => shop.id === currentShopId);
      const shopName = currentShop?.name?.replace(/[^a-z0-9]/gi, '_') || 'Shop'; // Sanitize filename
      const dateString = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });

      // Common data preparation
      const headers = ['Order ID', 'Customer', 'Date', 'Status', 'Amount', 'Payment'];
      const data = orders.map(sale => ([
        sale.id?.slice(0, 8) ?? '', // Truncated ID
        sale.customer?.name ?? 'Walking Customer',
        sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : 'N/A',
        sale.deliveryStatus ?? 'N/A',
        formatCurrencyForExport(sale.netAmount),
        sale.paymentStatus ?? 'N/A'
      ]));

      if (format === 'csv' || format === 'excel') {
        const mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const fileExtension = format === 'csv' ? 'csv' : 'xlsx';
        
        // Create CSV content with proper escaping
        const csvContent = [headers, ...data]
          .map(row => {
            if (Array.isArray(row)) {
              return row.map(cell => {
                // Escape quotes and wrap in quotes if contains comma
                const cellStr = String(cell);
                if (cellStr.includes(',') || cellStr.includes('"')) {
                  return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
              }).join(',');
            }
            return '';
          })
          .join('\n');
        
        // Create and download the file
        const blob = new Blob([csvContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${shopName}_Orders_${dateString}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Export Successful",
          description: `${format.toUpperCase()} file has been generated`,
          variant: "default",
        });
      }

      if (format === 'pdf') {
        try {
          // Create PDF document
          const doc = new jsPDF('l', 'mm', 'a4');
          doc.setFont('helvetica', 'normal');
          
          // Title Section
          doc.setFontSize(18);
          doc.text(`${shopName} - Orders Report`, 14, 20);
          doc.setFontSize(10);
          doc.setTextColor(100);
          
          // Shop Info
          if (currentShop) {
            doc.text(`Shop: ${currentShop.name}`, 14, 28);
            currentShop.address && doc.text(`Address: ${currentShop.address}`, 14, 33);
          }
          
          // Table
          autoTable(doc, {
            head: [headers.map(h => h.toUpperCase())],
            body: data,
            startY: currentShop ? 40 : 25,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [55, 65, 81], textColor: 255 },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            margin: { horizontal: 14 },
          });

          // Footer
          const pageCount = (doc as any).getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(
              `Generated on ${new Date().toLocaleString()}`,
              14,
              doc.internal.pageSize.height - 10
            );
            doc.text(
              `Page ${i} of ${pageCount}`,
              doc.internal.pageSize.width - 25,
              doc.internal.pageSize.height - 10
            );
          }

          // Save the PDF
          doc.save(`${shopName}_Orders_${dateString}.pdf`);
          
          toast({
            title: "Export Successful",
            description: "PDF report generated with order details",
            variant: "primary",
          });
        } catch (pdfError) {
          console.error('PDF Generation Error:', pdfError);
          toast({
            title: "PDF Error",
            description: "Failed to generate PDF document",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Export Failed:', error);
      toast({
        title: "Export Failed",
        description: "Could not generate export file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOrderClick = (orderId: string) => {
    onOrderClick(orderId);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return (
      <LoadingIndicator title="Loading orders..." subtitle="This may take a few moments" />
    );
  }

  return (
    <div className="container mx-auto p-6">
      {orders.length === 0 && !loading ? (
        <EmptyState 
          type="order"
          onAddOrder={onAddOrder}
        />
      ) : (
        <>
          {/* Header Section */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Orders</h1>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => onAddOrder?.()}>
                + New Order
              </Button>
            </div>
          </div>

          {/* Filters Section */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-[400px]">
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>

            <div className="min-w-[180px]">
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <ListFilter className="h-4 w-4" />
                    <SelectValue placeholder="Filter Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filters */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[160px]"
                />
              </div>
              <div className="flex flex-col">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[160px]"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <Card>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPageItems.map((order) => (
                      <TableRow 
                        key={order.id}
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={(e) => {
                          e.preventDefault();
                          if (order.id) handleViewDetails(order.id);
                        }}
                      >
                        <TableCell>
                          <span className="font-mono text-sm">
                            {order.id ? `${order.id.slice(0, 6)}...` : 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {order.customer?.id ? order.customer?.name : 'Walking Customer'}
                        </TableCell>
                        <TableCell>
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold
                            ${order.deliveryStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.deliveryStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'}`}>
                            {order.deliveryStatus}
                          </span>
                        </TableCell>
                        <TableCell>{formatCurrency(order.netAmount)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold
                            ${order.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' : 
                              'bg-yellow-100 text-yellow-800'}`}>
                            {order.paymentStatus === 'completed' ? 'paid' : order.paymentStatus}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (order.id) handleViewDetails(order.id);
                            }}
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination - Outside Card */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
              </span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="px-4 text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
