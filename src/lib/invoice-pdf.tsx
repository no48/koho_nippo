import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register Japanese font
Font.register({
  family: "NotoSansJP",
  src: "https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf",
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: 10,
    padding: 30,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  invoiceNumberBox: {
    border: "1px solid black",
    padding: "4 10",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 4,
  },
  dateSection: {
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  customerSection: {
    width: "50%",
  },
  companySection: {
    width: "45%",
    textAlign: "right",
    fontSize: 9,
  },
  customerName: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 5,
  },
  underline: {
    borderBottom: "1px solid black",
    paddingBottom: 2,
    marginBottom: 5,
  },
  table: {
    width: "100%",
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
    textAlign: "center",
    padding: "4 2",
    border: "1px solid black",
    fontSize: 9,
  },
  tableCell: {
    padding: "4 2",
    border: "1px solid black",
    fontSize: 9,
  },
  summaryTable: {
    width: "60%",
    marginBottom: 10,
  },
  summaryCell: {
    padding: "4 8",
    border: "1px solid black",
    fontSize: 9,
  },
  rightAlign: {
    textAlign: "right",
  },
  centerAlign: {
    textAlign: "center",
  },
  bold: {
    fontWeight: "bold",
  },
  registrationNumber: {
    fontSize: 9,
    marginBottom: 10,
  },
  detailTable: {
    width: "100%",
  },
  taxSummary: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  taxTable: {
    width: "40%",
  },
});

type InvoiceItem = {
  id: number;
  itemDate: string;
  description: string;
  amount: string | number;
  dailyReport?: {
    origin: string | null;
    destination: string | null;
    productName: string | null;
    tollFee: string | number | null;
  } | null;
};

type InvoiceData = {
  invoiceNumber: string;
  issueDate: string;
  customer: {
    name: string;
    address: string | null;
  };
  subtotal: string | number;
  tax: string | number;
  total: string | number;
  items: InvoiceItem[];
};

type CompanySettings = {
  companyName?: string;
  companyZipcode?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyFax?: string;
  invoiceRegistrationNumber?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccountType?: string;
  bankAccountNumber?: string;
};

type InvoicePDFProps = {
  invoice: InvoiceData;
  settings: CompanySettings;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const formatShortDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return num.toLocaleString("ja-JP");
};

export function InvoicePDF({ invoice, settings }: InvoicePDFProps) {
  const tollFeeTotal = invoice.items.reduce((sum, item) => {
    const fee = item.dailyReport?.tollFee;
    if (fee) {
      return sum + (typeof fee === "string" ? parseFloat(fee) : fee);
    }
    return sum;
  }, 0);

  const emptyRows = Math.max(0, 10 - invoice.items.length);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.invoiceNumberBox}>
            <Text>{invoice.invoiceNumber.split("-")[0]}-</Text>
          </View>
          <Text style={styles.title}>請求明細書</Text>
          <View style={styles.dateSection}>
            <Text>{formatDate(invoice.issueDate)}</Text>
            <Text>No. {invoice.invoiceNumber.split("-")[1] || "1"}</Text>
          </View>
        </View>

        {/* Customer and Company Info */}
        <View style={styles.infoRow}>
          <View style={styles.customerSection}>
            <View style={styles.underline}>
              <Text>{invoice.customer.address?.split(" ")[0] || ""}</Text>
            </View>
            <View style={styles.underline}>
              <Text>{invoice.customer.address?.split(" ").slice(1).join(" ") || ""}</Text>
            </View>
            <Text style={styles.customerName}>{invoice.customer.name} 御中</Text>
          </View>
          <View style={styles.companySection}>
            <Text style={styles.bold}>{settings.companyName || "株式会社 〇〇運輸"}</Text>
            <Text>〒{settings.companyZipcode || "000-0000"} {settings.companyAddress || ""}</Text>
            <Text>TEL {settings.companyPhone || ""} FAX {settings.companyFax || ""}</Text>
            <Text style={{ marginTop: 5 }}>お振込み口座は、以下の通りとなります。</Text>
            <Text>（銀行名）{settings.bankName || ""} {settings.bankBranch || ""} {settings.bankAccountType || ""} （口座番号）{settings.bankAccountNumber || ""}</Text>
          </View>
        </View>

        {/* Summary Table */}
        <View style={styles.summaryTable}>
          <View style={styles.tableRow}>
            <View style={{ width: "25%" }} />
            <Text style={[styles.tableHeader, { width: "18.75%" }]}>当月売上額</Text>
            <Text style={[styles.tableHeader, { width: "18.75%" }]}>通行料</Text>
            <Text style={[styles.tableHeader, { width: "18.75%" }]}>消費税額</Text>
            <Text style={[styles.tableHeader, { width: "18.75%" }]}>当月分請求額</Text>
          </View>
          <View style={styles.tableRow}>
            <View style={{ width: "25%" }} />
            <Text style={[styles.tableCell, styles.rightAlign, { width: "18.75%" }]}>¥{formatCurrency(invoice.subtotal)}</Text>
            <Text style={[styles.tableCell, styles.rightAlign, { width: "18.75%" }]}>¥{formatCurrency(tollFeeTotal)}</Text>
            <Text style={[styles.tableCell, styles.rightAlign, { width: "18.75%" }]}>¥{formatCurrency(invoice.tax)}</Text>
            <Text style={[styles.tableCell, styles.rightAlign, styles.bold, { width: "18.75%" }]}>¥{formatCurrency(invoice.total)}</Text>
          </View>
        </View>

        {/* Registration Number */}
        <Text style={styles.registrationNumber}>
          登録番号：{settings.invoiceRegistrationNumber || "T-0000000000000"}
        </Text>

        {/* Detail Table */}
        <View style={styles.detailTable}>
          <View style={styles.tableRow}>
            <Text style={[styles.tableHeader, { width: "8%" }]}>月日</Text>
            <Text style={[styles.tableHeader, { width: "23%" }]}>発地名</Text>
            <Text style={[styles.tableHeader, { width: "23%" }]}>着地名</Text>
            <Text style={[styles.tableHeader, { width: "20%" }]}>品名</Text>
            <Text style={[styles.tableHeader, { width: "12%" }]}>通行料</Text>
            <Text style={[styles.tableHeader, { width: "14%" }]}>金額</Text>
          </View>
          {invoice.items.map((item) => {
            const itemTollFee = item.dailyReport?.tollFee
              ? (typeof item.dailyReport.tollFee === "string" ? parseFloat(item.dailyReport.tollFee) : item.dailyReport.tollFee)
              : 0;
            const tollFeeExcTax = Math.round(itemTollFee / 1.1);

            return (
              <View style={styles.tableRow} key={item.id}>
                <Text style={[styles.tableCell, styles.centerAlign, { width: "8%" }]}>
                  {formatShortDate(item.itemDate)}
                </Text>
                <Text style={[styles.tableCell, { width: "23%" }]}>
                  {item.dailyReport?.origin || "-"}
                </Text>
                <Text style={[styles.tableCell, { width: "23%" }]}>
                  {item.dailyReport?.destination || "-"}
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {item.dailyReport?.productName || "-"}
                </Text>
                <Text style={[styles.tableCell, styles.rightAlign, { width: "12%" }]}>
                  {tollFeeExcTax > 0 ? formatCurrency(tollFeeExcTax) : "-"}
                </Text>
                <Text style={[styles.tableCell, styles.rightAlign, { width: "14%" }]}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            );
          })}
          {/* Empty rows */}
          {Array.from({ length: emptyRows }).map((_, i) => (
            <View style={styles.tableRow} key={`empty-${i}`}>
              <Text style={[styles.tableCell, { width: "8%" }]}> </Text>
              <Text style={[styles.tableCell, { width: "23%" }]}> </Text>
              <Text style={[styles.tableCell, { width: "23%" }]}> </Text>
              <Text style={[styles.tableCell, { width: "20%" }]}> </Text>
              <Text style={[styles.tableCell, { width: "12%" }]}> </Text>
              <Text style={[styles.tableCell, { width: "14%" }]}> </Text>
            </View>
          ))}
        </View>

        {/* Tax Summary */}
        <View style={styles.taxSummary}>
          <View style={styles.taxTable}>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { backgroundColor: "#f0f0f0", width: "50%" }]}>【10%】対象金額</Text>
              <Text style={[styles.tableCell, styles.rightAlign, { width: "50%" }]}>¥{formatCurrency(invoice.subtotal)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { backgroundColor: "#f0f0f0", width: "50%" }]}>【10%】消費税額</Text>
              <Text style={[styles.tableCell, styles.rightAlign, { width: "50%" }]}>¥{formatCurrency(invoice.tax)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { backgroundColor: "#f0f0f0", width: "50%" }]}>【 小　計 】</Text>
              <Text style={[styles.tableCell, styles.rightAlign, { width: "50%" }]}>
                {invoice.items.length}　¥{formatCurrency(invoice.subtotal)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.bold, { backgroundColor: "#f0f0f0", width: "50%" }]}>【 合　計 】</Text>
              <Text style={[styles.tableCell, styles.rightAlign, styles.bold, { width: "50%" }]}>
                {invoice.items.length}　¥{formatCurrency(invoice.total)}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
