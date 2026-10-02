"use client";
import React from "react";
import { useParams } from "next/navigation";
import DecryptedText from "@/marketing-components/DecryptedText";
import VideoBg from "@/marketing-components/VideoBg";
import { motion } from "framer-motion";

const fadeInProps = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.8 },
  viewport: { once: true },
};

export default function PrivacyPolicyPage() {
  const params = useParams();
  const locale = params?.locale as string;

  const isIndonesian = locale === "id";

  if (isIndonesian) {
    return (
      <div className="bg-white dark:bg-[#121212] pt-32">
        <VideoBg />
        <main className="container mx-auto px-4 md:px-8 max-w-4xl py-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <h1 className="text-4xl md:text-6xl font-black text-current mb-6 tracking-tight">
              <DecryptedText
                text="Kebijakan Privasi Paradapp"
                animateOn="view"
                revealDirection="start"
                speed={50}
              />
            </h1>
          </motion.div>

          <section className="space-y-12 pb-24 text-current/80">
            <motion.div {...fadeInProps} className="space-y-4">
              <h2 className="text-2xl font-bold text-current">PENDAHULUAN</h2>
              <p className="leading-relaxed">
                Paradapp ("kami") menghargai privasi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi data pribadi Anda saat menggunakan situs, aplikasi, dan layanan Paradapp (“Platform”).
              </p>
              <p className="leading-relaxed">
                Kami menganjurkan Anda untuk membaca Pernyataan Privasi ini secara saksama guna memahami bagaimana kami melindungi dan mengelola data pribadi Anda.
              </p>
              <p className="leading-relaxed">
                Untuk memudahkan pemahaman, kami telah menyertakan ringkasan dari poin-poin penting dalam kebijakan ini.
              </p>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-6">
              <h2 className="text-2xl font-bold text-current">INFORMASI PRIBADI YANG DIKUMPULKAN</h2>
              <p className="leading-relaxed">
                Kami mengumpulkan data pribadi saat Anda menggunakan atau mendaftar di Platform Paradapp. Informasi ini penting untuk menyediakan layanan kami secara optimal. Apabila data yang diminta tidak diberikan atau tidak lengkap, kami mungkin tidak dapat menyediakan layanan sebagaimana mestinya.
              </p>
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Jenis Informasi yang Dikumpulkan</h3>
                <p className="italic opacity-80">Informasi Pribadi adalah setiap data yang secara langsung maupun tidak langsung dapat mengidentifikasi individu atau perangkat. Jenis informasi yang kami kumpulkan meliputi:</p>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-current">A. Data Identitas</h4>
                    <ul className="list-disc list-inside ml-4 text-sm mt-1">
                      <li>Nama lengkap, Nomor Induk Kependudukan (NIK), Tanggal lahir, Pekerjaan, Pendapatan dan sumber pendapatan, Tujuan penggunaan, Foto atau swafoto, dan Data biometrik (jika berlaku)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-current">B. Data Kontak</h4>
                    <ul className="list-disc list-inside ml-4 text-sm mt-1">
                      <li>Alamat email, Nomor telepon, Alamat tempat tinggal atau penagihan</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-current">C. Data Kualifikasi (khusus Penyedia Layanan)</h4>
                    <ul className="list-disc list-inside ml-4 text-sm mt-1">
                      <li>Izin usaha, lisensi, atau sertifikasi, Informasi polis asuransi, dan Bukti kelayakan layanan</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-current">D. Data Finansial</h4>
                    <ul className="list-disc list-inside ml-4 text-sm mt-1">
                      <li>Nomor rekening bank, Informasi kartu pembayaran (termasuk jenis kartu, nama pemegang, nomor, CVV, masa berlaku), Riwayat dan status transaksi, dan Skor kredit (jika tersedia)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-current">E. Data Pembayaran</h4>
                    <ul className="list-disc list-inside ml-4 text-sm mt-1">
                      <li>Rincian transaksi uang elektronik atau dompet digital, Informasi penerima, jumlah pembayaran, dan rincian tagihan</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-current">F. Data Transaksi</h4>
                    <ul className="list-disc list-inside ml-4 text-sm mt-1">
                      <li>Layanan yang digunakan, Riwayat pembelian atau pemesanan, Preferensi pengguna, dan Tanggapan terhadap survei atau ulasan</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-current">G. Data Teknis</h4>
                    <ul className="list-disc list-inside ml-4 text-sm mt-1">
                      <li>Alamat IP, Informasi perangkat (tipe, sistem operasi, ID perangkat, log sistem), Riwayat penggunaan aplikasi dan halaman web, Cookie, ID iklan, serta catatan aktivitas</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-current">H. Data Lokasi</h4>
                    <ul className="list-disc list-inside ml-4 text-sm mt-1">
                      <li>Data geolokasi secara real-time dari perangkat Anda (jika diaktifkan)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Data Agregat</h3>
                <p className="leading-relaxed">Kami dapat membuat dan menggunakan data Agregat yaitu data statistik yang berasal dari informasi pribadi Anda tetapi tidak bisa digunakan untuk mengetahui siapa Anda. Kami memastikan data ini anonim dengan cara:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Menghapus seluruh pengenal individu; dan/atau</li>
                  <li>Menggabungkan data Anda ke dalam kumpulan data besar lainnya.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Jika Informasi Tidak Lengkap</h3>
                <p className="leading-relaxed">Jika kami membutuhkan informasi pribadi Anda karena diwajibkan oleh hukum atau diperlukan untuk menjalankan layanan, dan Anda tidak memberikannya atau memberikan data yang tidak lengkap, maka:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Kami mungkin tidak dapat memberikan sebagian atau seluruh layanan di Platform kepada Anda; atau</li>
                  <li>Kami mungkin tidak dapat melanjutkan proses layanan tertentu.</li>
                </ul>
              </div>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-6">
              <h2 className="text-2xl font-bold text-current">PEROLEHAN DAN PENGGUNAAN INFORMASI PRIBADI</h2>
              <p className="leading-relaxed">
                Data Pribadi merujuk pada informasi yang dapat digunakan, baik secara langsung maupun tidak langsung, untuk mengenali identitas Anda. Dalam penggunaan layanan Paradapp, kami dapat meminta Anda untuk memberikan data pribadi. Paradapp, bersama mitra penyedia layanan kami, dapat menggunakan dan membagikan data tersebut sesuai ketentuan dalam Kebijakan Privasi ini, termasuk untuk meningkatkan kualitas layanan dan fitur yang kami sediakan.
              </p>
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Bagaimana Kami Mendapatkan Data Anda</h3>
                <p>Kami memperoleh Data Pribadi melalui berbagai cara, baik secara langsung dari Anda maupun melalui pihak ketiga yang bekerja sama dengan kami, sesuai dengan ketentuan hukum yang berlaku.</p>
                
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-current">1. Data yang Diberikan Langsung oleh Anda</h4>
                  <p>Kami menerima data pribadi saat Anda berinteraksi dengan layanan kami, antara lain:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Saat melakukan pendaftaran atau membuat akun.</li>
                    <li>Menggunakan Platform, baik sebagai Pengguna maupun Penyedia Layanan.</li>
                    <li>Mengakses layanan keuangan kami, seperti dompet elektronik atau fasilitas pembayaran.</li>
                    <li>Menambahkan metode pembayaran atau sumber dana.</li>
                    <li>Berkomunikasi melalui fitur chat, mengisi formulir, atau memberikan masukan.</li>
                  </ul>
                  <p>Data yang mungkin kami kumpulkan mencakup:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Informasi identitas dan kontak (nama, alamat email, nomor telepon)</li>
                    <li>Data finansial dan transaksi</li>
                    <li>Informasi profil dan preferensi</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-current">2. Data yang Dihimpun saat Anda Mengakses Platform</h4>
                  <p>Saat Anda menggunakan Platform, kami secara otomatis mengumpulkan informasi teknis dan lokasi perangkat, seperti:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Jenis perangkat, sistem operasi, dan alamat IP</li>
                    <li>Data geo lokasi secara real-time, jika Anda mengaktifkan fitur lokasi pada perangkat Anda</li>
                  </ul>
                  <p>Beberapa fungsi Platform mungkin memerlukan akses ke lokasi Anda agar dapat bekerja secara optimal. Anda dapat menonaktifkan fitur ini kapan saja, meskipun hal tersebut dapat membatasi fungsionalitas layanan.</p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-current">3. Data dari Pihak Ketiga</h4>
                  <p>Kami juga dapat menerima Data Pribadi Anda dari pihak ketiga seperti:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Mitra, agen, penyedia layanan, atau institusi keuangan yang bekerja sama dengan kami</li>
                    <li>Vendor yang memfasilitasi registrasi atau proses transaksi Anda melalui Platform</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-current">4. Data Pribadi Milik Orang Lain</h4>
                  <p>Jika Anda memberikan data pribadi milik orang lain (misalnya keluarga atau teman), Anda bertanggung jawab untuk memastikan bahwa individu tersebut telah memberikan izin kepada Anda untuk membagikan data mereka kepada kami.</p>
                </div>
              </div>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-6">
              <h2 className="text-2xl font-bold text-current">TUJUAN PENGGUNAAN INFORMASI</h2>
              <p className="leading-relaxed">Kami menggunakan Data Pribadi Anda untuk menjalankan layanan secara efektif, memberikan pengalaman yang lebih baik, serta memenuhi kewajiban hukum dan kontraktual kami. Penggunaan ini meliputi:</p>
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Untuk Pengguna Paradapp</h3>
                <p>Jika Anda adalah pengguna Platform, data pribadi Anda digunakan untuk tujuan berikut:</p>
                <ul className="list-disc list-inside ml-4 space-y-2 text-sm">
                  <li><span className="font-bold">Manajemen Akun:</span> Membuat, memverifikasi, menonaktifkan, atau mengelola akun Anda.</li>
                  <li><span className="font-bold">Layanan Transaksi:</span> Memproses pembayaran, menautkan akun atau dompet digital, serta memberi notifikasi terkait aktivitas di Platform.</li>
                  <li><span className="font-bold">Verifikasi dan Layanan:</span> Memastikan kelayakan Anda menerima layanan dari Penyedia Layanan.</li>
                  <li><span className="font-bold">Komunikasi:</span> Mengirimkan informasi terkait penggunaan Platform, pembaruan layanan, atau merespons pertanyaan dan masukan Anda.</li>
                  <li><span className="font-bold">Personalisasi Layanan:</span> Menyesuaikan konten dan fitur berdasarkan preferensi dan perilaku Anda.</li>
                  <li><span className="font-bold">Analisis dan Pemantauan:</span> Melacak aktivitas dan pola penggunaan untuk meningkatkan kinerja Platform.</li>
                  <li><span className="font-bold">Program Loyalti (jika ada):</span> Mengelola dan memproses poin atau reward.</li>
                  <li><span className="font-bold">Pemasaran:</span> Mengirim promosi, penawaran khusus, iklan tertarget, voucher, atau survei (jika Anda menyetujui hal ini).</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Penggunaan Umum untuk Semua Individu</h3>
                <p>Terlepas dari peran Anda sebagai pengguna atau bukan, kami juga dapat menggunakan informasi Anda untuk tujuan yang lebih umum, termasuk:</p>
                <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                  <li>Operasional Bisnis: Mendukung fungsi internal, pemeliharaan, dan pengembangan teknologi.</li>
                  <li>Dukungan Teknis: Menyelesaikan masalah teknis dan kendala operasional.</li>
                  <li>Analitik dan Riset: Menghasilkan data statistik untuk pengembangan produk, inovasi, dan kolaborasi komersial.</li>
                  <li>Keamanan dan Kepatuhan: Mencegah serta menyelidiki aktivitas yang melanggar hukum atau merugikan.</li>
                  <li>Transaksi Korporasi: Mendukung proses merger, akuisisi, atau restrukturisasi aset yang melibatkan kami atau afiliasi kami.</li>
                  <li>Kepatuhan Regulasi: Menanggapi permintaan otoritas, memenuhi ketentuan hukum, audit, atau pelaporan.</li>
                </ul>
                <p>Jika penggunaan lain diperlukan, kami akan memberi pemberitahuan terlebih dahulu dan, bila diwajibkan, meminta persetujuan Anda.</p>
              </div>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-4">
              <h2 className="text-2xl font-bold text-current">PERSETUJUAN</h2>
              <p className="leading-relaxed">Dengan menyetujui Kebijakan Privasi ini, Anda mengkonfirmasi bahwa telah membaca, memahami, dan menerima seluruh isinya. Anda juga memberi izin kepada kami untuk mengumpulkan, menggunakan, menyimpan, membagikan, mengungkapkan, mentransfer, dan memproses Informasi Pribadi Anda sebagaimana dijelaskan di dalam kebijakan ini.</p>
              <p className="leading-relaxed">Jika Anda memberikan informasi pribadi milik orang lain (misalnya pasangan, keluarga, atau teman), Anda bertanggung jawab untuk memastikan bahwa mereka telah memberikan izin kepada Anda untuk memberikan informasi tersebut kepada kami.</p>
              <p className="leading-relaxed">Anda dapat mencabut persetujuan ini kapan saja dengan mengirimkan pemberitahuan tertulis kepada kami. Namun, harap dipahami bahwa pencabutan persetujuan dapat mempengaruhi akses Anda ke layanan kami, termasuk kemungkinan penutupan akun. Kami akan memberitahu Anda dampak dari pencabutan sebelum proses tersebut dilakukan.</p>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-6">
              <h2 className="text-2xl font-bold text-current">PEMBAGIAN INFORMASI PRIBADI</h2>
              <p className="leading-relaxed">Kami dapat membagikan Data Pribadi Anda dengan pihak tertentu guna mendukung operasional layanan Paradapp secara optimal. Pembagian informasi ini dilakukan dengan tetap mematuhi prinsip perlindungan data sesuai dengan Kebijakan Privasi ini.</p>
              <ol className="list-decimal list-inside ml-4 space-y-4">
                <li><span className="font-bold">Dengan Pengguna dan Penyedia Layanan:</span> Jika relevan, kami membagikan informasi Anda dengan Pengguna atau Penyedia Layanan lainnya untuk memungkinkan pelaksanaan layanan yang Anda minta melalui Platform.</li>
                <li><span className="font-bold">Mitra dan Pihak Ketiga:</span> Kami bekerja sama dengan penyedia layanan pihak ketiga (seperti penyedia pembayaran, layanan teknologi, dan penyimpanan data) yang membantu kami dalam menjalankan layanan.</li>
                <li><span className="font-bold">Dengan Afiliasi:</span> Kami dapat membagikan informasi Anda kepada entitas afiliasi kami untuk tujuan yang konsisten dengan Kebijakan Privasi ini.</li>
                <li><span className="font-bold">Dengan Pemerintah dan Regulator:</span> Kami akan membagikan informasi Anda jika diwajibkan oleh hukum yang berlaku, atau jika diminta oleh lembaga pemerintah.</li>
              </ol>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-8">
              <h2 className="text-2xl font-bold text-current">PENYIMPANAN DAN KEAMANAN DATA</h2>
              <p className="leading-relaxed">Kami menyimpan Informasi Pribadi hanya selama diperlukan untuk memenuhi tujuan pengumpulannya, atau selama disyaratkan oleh hukum yang berlaku. Setelah tujuan tersebut tercapai dan data tidak lagi diperlukan, kami akan menghapus atau menganonimkan informasi Anda sesuai ketentuan yang berlaku.</p>
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Penyimpanan oleh Pihak Lain</h3>
                <p>Perlu diketahui bahwa Informasi Pribadi Anda dapat disimpan oleh pihak lain, termasuk Pengguna, melalui cara yang berada di luar kendali kami, seperti tangkapan layar atau komunikasi di luar Platform.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Lokasi Pemrosesan Informasi</h3>
                <p>Informasi Pribadi Anda dapat diproses dan disimpan di server yang berlokasi di luar wilayah Indonesia, tergantung pada infrastruktur teknologi kami.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Durasi Penyimpanan Informasi</h3>
                <p>Kami hanya akan menyimpan Informasi Pribadi Anda selama diperlukan untuk memenuhi tujuan pengumpulannya, kecuali diwajibkan atau diizinkan untuk disimpan lebih lama.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Keamanan Data</h3>
                <p>Kami berkomitmen untuk menjaga kerahasiaan dan keamanan data pribadi Anda. Namun, perlu disadari bahwa pengiriman data melalui internet tidak sepenuhnya bebas risiko. Anda bertanggung jawab menjaga kerahasiaan akun Anda.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Pengungkapan Informasi Pribadi</h3>
                <p>Kami dapat mengungkapkan atau memberikan akses atas Informasi Pribadi Anda kepada pihak tertentu dalam kondisi dan untuk tujuan yang sah, termasuk untuk menjalankan layanan, kewajiban hukum, dan aktivitas korporasi.</p>
              </div>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-8">
              <h2 className="text-2xl font-bold text-current">HAK PENGGUNA ATAS DATA PRIBADI</h2>
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">1. Hak Hukum atas Informasi Pribadi</h3>
                <p>Berdasarkan hukum yang berlaku, Anda mungkin memiliki hak untuk mengakses, memperbaiki, atau meminta penghapusan informasi pribadi Anda.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Situs Web Pihak Ketiga dan Layanan Eksternal</h3>
                <p>Platform Paradapp dan Materi Pemasaran kami dapat menyertakan tautan ke situs web atau layanan pihak ketiga. Kami tidak bertanggung jawab atas praktik privasi situs eksternal mana pun.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Data Biometrik</h3>
                <p>Jika Anda menggunakan fitur autentikasi biometrik pada perangkat Anda, Paradapp tidak menyimpan data biometrik tersebut.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Materi Pemasaran dan Promosi</h3>
                <p>Dengan persetujuan Anda, kami dan mitra kami dapat mengirimkan Materi Pemasaran melalui berbagai saluran. Anda dapat memilih untuk berhenti berlangganan kapan saja.</p>
              </div>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-4">
              <h2 className="text-2xl font-bold text-current space-y-2">
                <div>TRANSFER DATA INTERNASIONAL</div>
                <div className="text-lg opacity-70">(JIKA BERLAKU)</div>
              </h2>
              <p className="leading-relaxed">Dalam rangka menyediakan layanan secara menyeluruh dan konsisten di berbagai negara, kami dapat memindahkan Informasi Pribadi Anda dari negara asal ke negara lain tempat Platform dan layanan Paradapp tersedia.</p>
              <p className="leading-relaxed">Dengan menggunakan layanan Paradapp, Anda menyatakan telah memahami dan menyetujui bahwa Informasi Pribadi Anda dapat dipindahkan dan/atau diakses di luar negara asal Anda.</p>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-4">
              <h2 className="text-2xl font-bold text-current">PEMBARUAN KEBIJAKAN PRIVASI</h2>
              <p className="leading-relaxed">Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Kami mendorong Anda untuk secara berkala meninjau Kebijakan Privasi ini agar tetap mengetahui cara kami mengelola informasi Anda.</p>
            </motion.div>

            <motion.div {...fadeInProps} className="pt-12 border-t border-current/10">
              <h2 className="text-2xl font-bold text-current mb-4">HUBUNGI KAMI</h2>
              <p>Jika Anda memiliki pertanyaan, permintaan akses atau koreksi data, atau keluhan terkait Kebijakan Privasi ini, silakan hubungi kami melalui:</p>
              <div className="mt-4 space-y-2">
                <p><span className="font-bold">Email:</span> <a href="mailto:support@paradapp.com" className="underline underline-offset-4">support@paradapp.com</a></p>
                <p><span className="font-bold">Website:</span> <a href="https://paradapp.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">https://paradapp.com</a></p>
              </div>
            </motion.div>
          </section>
        </main>
      </div>
    );
  }

  // Default to English
  return (
    <div className="bg-white dark:bg-[#121212] pt-32">
      <VideoBg />
      <main className="container mx-auto px-4 md:px-8 max-w-4xl py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-black text-current mb-6 tracking-tight">
            <DecryptedText
              text="Paradapp Privacy Policy"
              animateOn="view"
              revealDirection="start"
              speed={50}
            />
          </h1>
        </motion.div>

        <section className="space-y-12 pb-24 text-current/80">
          <motion.div {...fadeInProps} className="space-y-4">
            <h2 className="text-2xl font-bold text-current">Introduction</h2>
            <p className="text-lg leading-relaxed">
              Paradapp ("we", "us", or "our") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and safeguard your personal data when you access or use Paradapp’s website, applications, and services (collectively referred to as the “Platform”).
            </p>
            <p className="text-lg leading-relaxed">
              We encourage you to read this Privacy Policy carefully to understand how we manage and protect your personal information.
            </p>
            <p className="text-lg leading-relaxed">
              To help improve readability, we have summarized the key points of this policy, but the full policy should be reviewed to fully understand our data practices.
            </p>
          </motion.div>

          <motion.div {...fadeInProps} className="space-y-4">
            <h2 className="text-2xl font-bold text-current">Personal Information We Collect</h2>
            <p className="leading-relaxed">
              We collect certain personal information when you access, register for, or interact with the Paradapp Platform. This information allows us to provide our services effectively. If required information is not provided or is incomplete, we may not be able to deliver certain services.
            </p>
            
            <div className="space-y-6 mt-6">
              <h3 className="text-xl font-bold text-current">Types of Information Collected</h3>
              <p className="italic opacity-80">Personal Information refers to any data that can directly or indirectly identify an individual or a device.</p>
              
              <ol className="space-y-6 list-decimal list-inside">
                <li className="font-bold text-current">Identity Data
                  <p className="font-normal mt-2 text-current/80">Full name, National Identification Number (NIK), date of birth, occupation, income and source of income, purpose of use, photograph or selfie, and biometric data (if applicable).</p>
                </li>
                <li className="font-bold text-current">Contact Data
                  <p className="font-normal mt-2 text-current/80">Email address, phone number, and residential or billing address.</p>
                </li>
                <li className="font-bold text-current">Qualification Data (For Service Providers if applicable)
                  <p className="font-normal mt-2 text-current/80">Business permits, licenses, or certifications, insurance policy information, and proof of service eligibility.</p>
                </li>
                <li className="font-bold text-current">Financial Data
                  <p className="font-normal mt-2 text-current/80">Bank account number, payment card information (including card type, cardholder name, card number, CVV, and expiration date), transaction history and status, and credit score (if available).</p>
                </li>
                <li className="font-bold text-current">Payment Data
                  <p className="font-normal mt-2 text-current/80">Details of electronic money or digital wallet transactions, recipient information, payment amount, and billing details.</p>
                </li>
                <li className="font-bold text-current">Transaction Data
                  <p className="font-normal mt-2 text-current/80">Services used, purchase or order history, user preferences, and responses to surveys or reviews.</p>
                </li>
                <li className="font-bold text-current">Technical Data
                  <p className="font-normal mt-2 text-current/80">IP address, device information (including device type, operating system, device ID, and system logs), application and web page usage history, cookies, advertising identifiers, and activity logs.</p>
                </li>
                <li className="font-bold text-current">Location Data
                  <p className="font-normal mt-2 text-current/80">Real-time geolocation data from your device (if enabled).</p>
                </li>
              </ol>
            </div>

            <div className="space-y-4 mt-8">
              <h3 className="text-xl font-bold text-current">Aggregated Data</h3>
              <p className="leading-relaxed">
                We may generate and use Aggregated Data, which consists of statistical data derived from your personal information but cannot be used to identify you as an individual.
              </p>
              <p>We ensure that this data remains anonymous by:</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Removing all individual identifiers; and/or</li>
                <li>Combining your data with larger datasets belonging to other users.</li>
              </ul>
            </div>

            <div className="space-y-4 mt-8">
              <h3 className="text-xl font-bold text-current">If Required Information Is Not Provided</h3>
              <p className="leading-relaxed">
                If we require your personal information to comply with legal obligations or to provide our services, and you do not provide such information or provide incomplete data, then:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>We may be unable to provide some or all services on the Platform to you; or</li>
                <li>We may be unable to proceed with certain service processes.</li>
              </ul>
            </div>
          </motion.div>

          <motion.div {...fadeInProps} className="space-y-4">
            <h2 className="text-2xl font-bold text-current">Collection And Use Of Personal Information</h2>
            <p className="leading-relaxed">
              Personal Data refers to information that can be used, either directly or indirectly, to identify you. In the course of using Paradapp services, we may request that you provide certain personal data. Paradapp, together with our service provider partners, may use and share such data in accordance with the provisions of this Privacy Policy, including for the purpose of improving the quality of the services and features that we provide.
            </p>
            
            <div className="space-y-6 mt-6">
              <h3 className="text-xl font-bold text-current">How We Obtain Your Data</h3>
              <p>We obtain Personal Data through various methods, either directly from you or through third parties that work with us, in accordance with applicable legal regulations.</p>
              
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-current">1. Information You Provide Directly</h4>
                <p>We receive personal data when you interact with our services, including when you:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Register or create an account.</li>
                  <li>Use the Platform, either as a User or a Service Provider.</li>
                  <li>Access our financial services, such as electronic wallets or payment facilities.</li>
                  <li>Add a payment method or funding source.</li>
                  <li>Communicate through chat features, complete forms, or provide feedback.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-bold text-current">2. Data Collected When You Access the Platform</h4>
                <p>When you use the Platform, we automatically collect certain technical information and device location data, such as:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Device type, operating system, and IP address</li>
                  <li>Real-time geolocation data, if you enable location services on your device</li>
                </ul>
                <p>Some functions of the Platform may require access to your location in order to operate optimally. You may disable this feature at any time, although doing so may limit certain functionalities of the service.</p>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-bold text-current">3. Information from Third Parties</h4>
                <p>We may also receive your Personal Data from third parties such as:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Partners, agents, service providers, or financial institutions that collaborate with us</li>
                  <li>Vendors that facilitate your registration or transaction processes through the Platform</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-bold text-current">4. Personal Data of Other Individuals</h4>
                <p>If you provide personal data belonging to another individual (for example, a family member or friend), you are responsible for ensuring that the individual has granted permission for you to share their data with us.</p>
              </div>
            </div>

            <div className="space-y-6 mt-8">
              <h3 className="text-xl font-bold text-current">Purpose of Using Personal Information</h3>
              <p>We use your Personal Data to operate our services effectively, provide a better user experience, and fulfill our legal and contractual obligations. Such use includes:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <h4 className="font-bold text-current">For Paradapp Users</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm pl-2">
                      <li>Account Management: Creating, verifying, deactivating, or managing your account.</li>
                      <li>Transaction Services: Processing payments, linking accounts or digital wallets, and providing notifications related to activities on the Platform.</li>
                      <li>Verification and Services: Ensuring your eligibility to receive services from Service Providers.</li>
                      <li>Communication: Sending information related to the use of the Platform, service updates, or responding to your questions and feedback.</li>
                      <li>Service Personalization: Customizing content and features based on your preferences and behavior.</li>
                      <li>Analysis and Monitoring: Tracking activities and usage patterns to improve the performance of the Platform.</li>
                      <li>Loyalty Programs (if applicable): Managing and processing points or rewards.</li>
                      <li>Marketing: Sending promotions, special offers, targeted advertisements, vouchers, or surveys.</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-bold text-current">General Purposes</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm pl-2">
                      <li>Business Operations: Supporting internal functions, maintenance, and technology development.</li>
                      <li>Technical Support: Resolving technical issues and operational problems.</li>
                      <li>Analytics and Research: Generating statistical data for product development.</li>
                      <li>Security and Compliance: Preventing and investigating unlawful activities.</li>
                      <li>Corporate Transactions: Supporting mergers, acquisitions, or asset restructuring.</li>
                      <li>Regulatory Compliance: Responding to requests from authorities.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4 mt-8">
              <h3 className="text-xl font-bold text-current">Consent</h3>
              <p>By agreeing to this Privacy Policy, you confirm that you have read, understood, and accepted its entire contents. You also grant us permission to collect, use, store, share, disclose, transfer, and process your Personal Information as described in this policy.</p>
              <p>You may withdraw this consent at any time by sending us a written notice. However, please understand that withdrawing consent may affect your access to our services, including the possible closure of your account.</p>
            </div>
          </motion.div>

          <motion.div {...fadeInProps} className="space-y-4">
            <h2 className="text-2xl font-bold text-current">Sharing of Personal Information</h2>
            <p className="leading-relaxed">We may share your Personal Data with certain parties to support the optimal operation of Paradapp services:</p>
            <ol className="space-y-4 list-decimal list-inside pl-4">
              <li><strong className="text-current">With Users and Service Providers:</strong> Where relevant, we may share your information with other Users or Service Providers to enable the delivery of services.</li>
              <li><strong className="text-current">With Partners and Third Parties:</strong> We work with third-party service providers (such as payment providers, technology service providers, and data storage providers).</li>
              <li><strong className="text-current">With Affiliates:</strong> We may share your information with our affiliated entities for purposes consistent with this Privacy Policy.</li>
              <li><strong className="text-current">With Government and Regulators:</strong> We may share your information if required by applicable law, or if requested by government authorities.</li>
            </ol>
          </motion.div>

          <motion.div {...fadeInProps} className="space-y-8">
            <h2 className="text-2xl font-bold text-current">Data Storage and Security</h2>
            <p className="leading-relaxed">We retain Personal Information only for as long as necessary to fulfill the purposes for which it was collected, or as required by applicable law.</p>
            
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-current">Storage by Third Parties</h3>
              <p>Please note that your Personal Information may be stored by other parties, including Users, through means that are outside of our control, such as screenshots or communications conducted outside the Platform.</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-current">Data Processing Location</h3>
              <p>Your Personal Information may be processed and stored on servers located outside Indonesia, depending on our technology infrastructure.</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-current">Duration of Information Retention</h3>
              <p>We will retain your Personal Information only for as long as necessary to fulfill the purposes for which it was collected, unless we are required to retain it for a longer period.</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-current">Data Security</h3>
              <p>We are committed to maintaining the confidentiality and security of your personal data. However, it should be understood that the transmission of data over the internet is not entirely risk-free.</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-current">Disclosure of Personal Information</h3>
              <p>We may disclose or grant access to your Personal Information to certain parties under lawful conditions and for legitimate purposes, including to provide services, comply with legal obligations, or for corporate activities.</p>
            </div>
          </motion.div>

          <motion.div {...fadeInProps} className="space-y-8">
            <h2 className="text-2xl font-bold text-current">User Rights Regarding Personal Data</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-current">1. Legal Rights Over Personal Information</h3>
              <p>Subject to applicable laws, you may have the right to access, correct, or request deletion of your information. We may refuse such requests if required or permitted by law.</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-current">Third-Party Websites and Services</h3>
              <p>The Paradapp Platform may contain links to third-party websites. We are not responsible for the privacy practices of any external websites or services.</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-current">Biometric Data</h3>
              <p>If you use biometric authentication features on your device, Paradapp does not store such biometric data. The data is stored locally on your device.</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-current">Marketing and Promotional Materials</h3>
              <p>With your consent, we and our partners may send you Marketing Materials. You may choose to stop receiving promotional messages at any time.</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-current">International Data Transfers</h3>
              <p>We may transfer your Personal Information outside your jurisdiction to provide services consistently across multiple countries.</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-current">Updates to This Privacy Policy</h3>
              <p>We may update this Privacy Policy from time to time. By continuing to use our Platform, you are deemed to have accepted the updated policy.</p>
            </div>
          </motion.div>

          <motion.div {...fadeInProps} className="pt-12 border-t border-current/10">
            <h2 className="text-2xl font-bold text-current mb-4">Contact Us</h2>
            <p>If you have any questions, requests for access or correction of your data, or complaints regarding this Privacy Policy, please contact us at:</p>
            <div className="mt-4 space-y-2">
              <p><span className="font-bold">Email:</span> <a href="mailto:support@paradapp.com" className="underline underline-offset-4">support@paradapp.com</a></p>
              <p><span className="font-bold">Website:</span> <a href="https://paradapp.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">https://paradapp.com</a></p>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
