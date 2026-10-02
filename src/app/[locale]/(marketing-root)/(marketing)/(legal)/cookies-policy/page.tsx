"use client";

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

export default function CookiesPolicyPage() {
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
                text="Kebijakan Cookie Paradapp"
                animateOn="view"
                revealDirection="start"
                speed={50}
              />
            </h1>
          </motion.div>

          <section className="space-y-12 pb-24 text-current/80">
            <motion.div {...fadeInProps} className="space-y-4">
              <h2 className="text-2xl font-bold text-current">Pendahuluan</h2>
              <p className="text-lg leading-relaxed">
                Kebijakan Cookie ini menjelaskan bagaimana Paradapp (“Paradapp”, “kami”, “milik kami”) menggunakan cookie dan teknologi serupa ketika Anda mengunjungi atau berinteraksi dengan paradapp.com (“Situs Web”) atau menggunakan platform Paradapp.
              </p>
              <p className="text-lg leading-relaxed">
                Dengan menggunakan Situs Web ini, Anda menyetujui penggunaan cookie sebagaimana dijelaskan dalam kebijakan ini. Apabila diwajibkan oleh hukum yang berlaku, kami akan meminta persetujuan Anda sebelum menempatkan jenis cookie tertentu pada perangkat Anda.
              </p>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-4">
              <h2 className="text-2xl font-bold text-current">Apa Itu Cookie</h2>
              <p className="leading-relaxed">
                Cookie adalah file teks kecil yang disimpan di perangkat Anda (komputer, tablet, atau ponsel) ketika Anda mengunjungi sebuah situs web. File ini memungkinkan situs web untuk mengenali perangkat Anda dan mengingat informasi tertentu terkait kunjungan Anda.
              </p>
              <p className="leading-relaxed">
                Cookie membantu meningkatkan fungsi situs web, mengingat preferensi Anda, menganalisis pola penggunaan, serta meningkatkan pengalaman pengguna secara keseluruhan.
              </p>
              <p className="leading-relaxed">
                Teknologi serupa seperti local storage, pixel, dan skrip analitik juga dapat digunakan untuk tujuan yang sebanding.
              </p>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-4">
              <h2 className="text-2xl font-bold text-current">Bagaimana Paradapp Menggunakan Cookie</h2>
              <p className="leading-relaxed">
                Paradapp menggunakan cookie dan teknologi terkait untuk mendukung fungsi dan kinerja platform kami. Teknologi ini membantu kami untuk:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Memastikan situs web berfungsi dengan baik</li>
                <li>Menjaga keamanan sesi dan interaksi pengguna</li>
                <li>Mengingat preferensi pengguna dan pengaturan antarmuka</li>
                <li>Menganalisis bagaimana pengunjung menggunakan situs web</li>
                <li>Meningkatkan performa dan kegunaan platform</li>
                <li>Mendukung koneksi wallet dan fitur interaksi Web3</li>
                <li>Mengaktifkan fitur di masa depan seperti integrasi pemasaran atau periklanan</li>
              </ul>
              <p className="leading-relaxed">
                Beberapa cookie bersifat penting untuk menjalankan platform, sementara yang lain membantu kami memahami perilaku pengguna atau meningkatkan layanan.
              </p>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-8">
              <h2 className="text-2xl font-bold text-current">Jenis Cookie yang Kami Gunakan</h2>
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Cookie Esensial</h3>
                <p>Cookie esensial diperlukan agar Situs Web dan fitur inti platform dapat berfungsi dengan baik. Cookie ini tidak dapat dinonaktifkan melalui alat pengelolaan cookie kami.</p>
                <p>Cookie ini dapat digunakan untuk:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Menjaga keamanan sesi pengguna</li>
                  <li>Memungkinkan navigasi antar halaman</li>
                  <li>Mendukung status koneksi wallet</li>
                  <li>Menjaga stabilitas dan keamanan sistem</li>
                </ul>
                <p>Tanpa cookie ini, beberapa bagian dari Situs Web mungkin tidak dapat berfungsi dengan semestinya.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Cookie Fungsional</h3>
                <p>Cookie fungsional memungkinkan Situs Web untuk mengingat pilihan yang Anda buat guna meningkatkan pengalaman penggunaan.</p>
                <p>Cookie ini dapat menyimpan informasi seperti:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Preferensi antarmuka</li>
                  <li>Jaringan blockchain yang dipilih</li>
                  <li>Pengaturan tampilan atau tata letak</li>
                  <li>Preferensi bahasa</li>
                </ul>
                <p>Cookie ini membantu memberikan pengalaman penggunaan yang lebih lancar dan personal saat menggunakan platform Paradapp.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Cookie Analitik</h3>
                <p>Cookie analitik membantu kami memahami bagaimana pengguna berinteraksi dengan Situs Web sehingga kami dapat meningkatkan fungsi dan kegunaan platform.</p>
                <p>Saat ini Paradapp menggunakan Google Analytics untuk mengumpulkan informasi agregat seperti:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Halaman yang dikunjungi</li>
                  <li>Durasi waktu yang dihabiskan di platform</li>
                  <li>Pola interaksi pengguna</li>
                  <li>Wilayah geografis umum (bukan lokasi yang spesifik)</li>
                  <li>Informasi perangkat atau browser</li>
                </ul>
                <p>Informasi yang dikumpulkan hanya digunakan untuk analisis statistik dan kinerja dan tidak secara langsung mengidentifikasi pengguna secara individu.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-current">Cookie Periklanan</h3>
                <p>Saat ini Paradapp belum menggunakan cookie periklanan.</p>
                <p>Namun di masa mendatang kami mungkin akan memperkenalkan alat pemasaran atau periklanan (seperti platform iklan atau analitik pemasaran) untuk membantu mempromosikan ekosistem Paradapp.</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Jika alat tersebut diterapkan, cookie dapat digunakan untuk:</li>
                  <li>Mengukur efektivitas kampanye pemasaran</li>
                  <li>Menyampaikan konten atau materi promosi yang relevan</li>
                  <li>Memahami keterlibatan pengguna terhadap upaya pemasaran</li>
                </ul>
                <p>Setiap penggunaan cookie periklanan di masa depan akan diinformasikan secara jelas dan dapat memerlukan persetujuan Anda sesuai dengan hukum yang berlaku.</p>
              </div>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-4">
              <h2 className="text-2xl font-bold text-current">Interaksi Web3 dan Wallet</h2>
              <p className="leading-relaxed">
                Karena Paradapp beroperasi dalam ekosistem terdesentralisasi, beberapa cookie atau teknologi serupa dapat digunakan untuk mendukung fungsi terkait Web3.
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Teknologi ini dapat membantu untuk:</li>
                <li>Menjaga sesi koneksi wallet</li>
                <li>Menyimpan status antarmuka sementara</li>
                <li>Mengingat jaringan blockchain yang dipilih</li>
                <li>Meningkatkan interaksi dengan aplikasi terdesentralisasi (dApps)</li>
              </ul>
              <p className="leading-relaxed">
                Paradapp tidak menyimpan private key, kredensial wallet, atau data sensitif wallet dalam cookie.
              </p>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-4">
              <h2 className="text-2xl font-bold text-current">Cookie Pihak Ketiga</h2>
              <p className="leading-relaxed">
                Beberapa cookie dapat ditempatkan oleh layanan pihak ketiga yang beroperasi di atau melalui Situs Web kami.
              </p>
              <p className="leading-relaxed">
                Contohnya termasuk:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Penyedia layanan analitik</li>
                <li>Layanan infrastruktur</li>
                <li>Aplikasi atau integrasi yang disematkan</li>
                <li>Aplikasi terdesentralisasi eksternal yang dapat diakses melalui platform</li>
              </ul>
              <p className="leading-relaxed">
                Pihak ketiga tersebut dapat mengumpulkan informasi sesuai dengan kebijakan privasi dan cookie mereka masing-masing. Paradapp tidak memiliki kendali atas bagaimana penyedia eksternal tersebut menggunakan informasi yang mereka kumpulkan.
              </p>
              <p className="leading-relaxed">
                Kami menyarankan Anda untuk meninjau kebijakan privasi dan cookie dari layanan pihak ketiga yang Anda gunakan.
              </p>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-4">
              <h2 className="text-2xl font-bold text-current">Durasi Penyimpanan Cookie</h2>
              <p className="leading-relaxed">
                Cookie dapat tetap tersimpan di perangkat Anda untuk jangka waktu yang berbeda tergantung pada tujuannya.
              </p>
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-current">Cookie Sesi</h3>
                <p>Cookie ini hanya ada selama sesi browser Anda aktif dan akan otomatis dihapus ketika Anda menutup browser.</p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-current">Cookie Persisten</h3>
                <p>Cookie ini tetap tersimpan di perangkat Anda selama jangka waktu tertentu atau hingga Anda menghapusnya secara manual. Cookie ini membantu mengingat preferensi Anda saat kembali mengunjungi situs.</p>
              </div>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-4">
              <h2 className="text-2xl font-bold text-current">Mengelola Preferensi Cookie Anda</h2>
              <p className="leading-relaxed">
                Ketika Anda mengunjungi paradapp.com, Anda mungkin akan melihat banner persetujuan cookie yang memungkinkan Anda untuk:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Menerima semua cookie</li>
                <li>Menolak cookie yang tidak esensial</li>
                <li>Menyesuaikan preferensi cookie Anda</li>
              </ul>
              <p className="leading-relaxed">
                Anda juga dapat mengelola atau menghapus cookie melalui pengaturan browser Anda. Sebagian besar browser memungkinkan Anda untuk:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Melihat cookie yang tersimpan</li>
                <li>Menghapus cookie</li>
                <li>Memblokir semua cookie</li>
                <li>Memblokir cookie dari situs tertentu</li>
              </ul>
              <p className="leading-relaxed">
                Harap diperhatikan bahwa menonaktifkan cookie tertentu dapat mempengaruhi fungsi atau kinerja Situs Web.
              </p>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-4">
              <h2 className="text-2xl font-bold text-current">Sinyal Do Not Track</h2>
              <p className="leading-relaxed">
                Beberapa browser web memungkinkan pengguna untuk mengirimkan sinyal “Do Not Track” (DNT). Saat ini belum ada standar universal mengenai bagaimana situs web harus merespons sinyal tersebut.
              </p>
              <p className="leading-relaxed">
                Oleh karena itu, Paradapp saat ini tidak merespons secara khusus terhadap sinyal DNT.
              </p>
            </motion.div>

            <motion.div {...fadeInProps} className="space-y-4">
              <h2 className="text-2xl font-bold text-current">Pembaruan Kebijakan Cookie Ini</h2>
              <p className="leading-relaxed">
                Kami dapat memperbarui Kebijakan Cookie ini dari waktu ke waktu untuk mencerminkan perubahan teknologi, persyaratan hukum, atau cara platform kami beroperasi.
              </p>
              <p className="leading-relaxed">
                Ketika pembaruan dilakukan, kami akan memperbarui tanggal “Terakhir Diperbarui” di bagian atas kebijakan ini. Dalam beberapa kasus, kami juga dapat memberikan pemberitahuan tambahan apabila diwajibkan oleh hukum yang berlaku.
              </p>
              <p className="leading-relaxed">
                Kami menyarankan pengguna untuk meninjau kebijakan ini secara berkala.
              </p>
            </motion.div>

            <motion.div {...fadeInProps} className="pt-12 border-t border-current/10">
              <h2 className="text-2xl font-bold text-current mb-4">Hubungi Kami</h2>
              <p>Jika Anda memiliki pertanyaan mengenai Kebijakan Cookie ini atau bagaimana Paradapp menggunakan cookie dan teknologi terkait, Anda dapat menghubungi kami melalui:</p>
              <p className="mt-4">Email: <a href="mailto:support@paradapp.com" className="underline underline-offset-4">support@paradapp.com</a></p>
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
              text="Paradapp Cookies Policy"
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
              This Cookies Policy explains how Paradapp ("Paradapp", "we", "our", or "us") uses cookies and similar technologies when you visit or interact with paradapp.com (the "Website") or use the Paradapp platform.
            </p>
            <p className="text-lg leading-relaxed">
              By using the Website, you consent to the use of cookies as described in this policy. When required by law, we will request your permission before placing certain types of cookies on your device.
            </p>
          </motion.div>

          <motion.div {...fadeInProps} className="space-y-4">
            <h2 className="text-2xl font-bold text-current">What Are Cookies</h2>
            <p className="leading-relaxed">
              Cookies are small text files stored on your device (computer, tablet, or mobile phone) when you visit a website. These files allow websites to recognize your device and remember certain information about your visit.
            </p>
            <p className="leading-relaxed">
              Cookies help improve website functionality, remember your preferences, analyze usage patterns, and enhance the overall user experience.
            </p>
            <p className="leading-relaxed">
              Similar technologies such as local storage, pixels, and analytics scripts may also be used for comparable purposes.
            </p>
          </motion.div>

          <motion.div {...fadeInProps} className="space-y-4">
            <h2 className="text-2xl font-bold text-current">How Paradapp Uses Cookies</h2>
            <p className="leading-relaxed">
              Paradapp uses cookies and related technologies to support the functionality and performance of our platform. These technologies help us:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-4">
              <li>Ensure the website operates properly</li>
              <li>Maintain secure sessions and interactions</li>
              <li>Remember user preferences and interface settings</li>
              <li>Analyze how visitors use the website</li>
              <li>Improve platform performance and usability</li>
              <li>Support wallet connection and Web3 interaction features</li>
              <li>Enable future features such as marketing or advertising integrations</li>
            </ul>
            <p className="leading-relaxed">
              Some cookies are essential for the platform to function, while others help us understand user behavior or improve services.
            </p>
          </motion.div>

          <motion.div {...fadeInProps} className="space-y-8">
            <h2 className="text-2xl font-bold text-current">Types of Cookies We Use</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-current">Essential Cookies</h3>
              <p>Essential cookies are required for the Website and core platform features to function properly. These cookies cannot be disabled through our cookie management tools.</p>
              <p>They may be used to:</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Maintain secure sessions</li>
                <li>Enable navigation across pages</li>
                <li>Support wallet connection states</li>
                <li>Maintain system stability and security</li>
              </ul>
              <p>Without these cookies, some parts of the Website may not operate correctly.</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-current">Functional Cookies</h3>
              <p>Functional cookies allow the Website to remember choices you make in order to improve your experience.</p>
              <p>These cookies may store information such as:</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Interface preferences</li>
                <li>Selected blockchain network</li>
                <li>Display or layout settings</li>
                <li>Language preferences</li>
              </ul>
              <p>These cookies help provide a smoother and more personalized experience when using the Paradapp platform.</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-current">Analytics Cookies</h3>
              <p>Analytics cookies help us understand how users interact with the Website so we can improve functionality and usability.</p>
              <p>Paradapp currently uses Google Analytics to collect aggregated information such as:</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Pages visited</li>
                <li>Time spent on the platform</li>
                <li>User interaction patterns</li>
                <li>General geographic region (not precise location)</li>
                <li>Device or browser information</li>
              </ul>
              <p>The information collected is used only for statistical and performance analysis and does not directly identify individual users.</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-current">Advertising Cookies</h3>
              <p>At present, Paradapp does not use advertising cookies.</p>
              <p>However, in the future we may introduce advertising or marketing tools (such as advertising platforms or marketing analytics) to help promote the Paradapp ecosystem.</p>
              <p>If such tools are implemented, they may use cookies to:</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Measure marketing campaign effectiveness</li>
                <li>Deliver relevant content or promotional materials</li>
                <li>Understand user engagement with marketing efforts</li>
              </ul>
              <p>Any future use of advertising cookies will be clearly disclosed and may require your consent depending on applicable laws.</p>
            </div>
          </motion.div>

          <motion.div {...fadeInProps} className="space-y-4">
            <h2 className="text-2xl font-bold text-current">Web3 and Wallet Interaction</h2>
            <p className="leading-relaxed">
              Because Paradapp operates within a decentralized ecosystem, certain cookies or similar technologies may be used to support Web3-related functionality.
            </p>
            <p className="leading-relaxed">
              These technologies may help:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-4">
              <li>Maintain wallet connection sessions</li>
              <li>Store temporary interface states</li>
              <li>Remember selected blockchain networks</li>
              <li>Improve interaction with decentralized applications (dApps)</li>
            </ul>
            <p className="leading-relaxed">
              Paradapp does not store private keys, wallet credentials, or sensitive wallet data in cookies.
            </p>
          </motion.div>

          <motion.div {...fadeInProps} className="space-y-4">
            <h2 className="text-2xl font-bold text-current">Third-Party Cookies</h2>
            <p className="leading-relaxed">
              Some cookies may be placed by third-party services that operate on or through our Website.
            </p>
            <p className="leading-relaxed">
              These may include:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-4">
              <li>Analytics providers</li>
              <li>Infrastructure services</li>
              <li>Embedded applications or integrations</li>
              <li>External decentralized applications accessible through the platform</li>
            </ul>
            <p className="leading-relaxed">
              These third parties may collect information according to their own privacy and cookie policies. Paradapp does not control how these external providers use the information they collect.
            </p>
            <p className="leading-relaxed">
              We recommend reviewing the privacy and cookie policies of any third-party services you interact with.
            </p>
          </motion.div>

          <motion.div {...fadeInProps} className="space-y-4">
            <h2 className="text-2xl font-bold text-current">Cookie Duration</h2>
            <p className="leading-relaxed">
              Cookies may remain on your device for different periods of time depending on their purpose.
            </p>
            <div className="space-y-4">
              <p><strong className="text-current">Session Cookies</strong></p>
              <p>These cookies exist only while your browser session is active and are automatically deleted when you close your browser.</p>
            </div>
            <div className="space-y-4">
              <p><strong className="text-current">Persistent Cookies</strong></p>
              <p>These cookies remain on your device for a set period of time or until you delete them manually. They help remember preferences across visits.</p>
            </div>
          </motion.div>

          <motion.div {...fadeInProps} className="space-y-4">
            <h2 className="text-2xl font-bold text-current">Managing Your Cookie Preferences</h2>
            <p className="leading-relaxed">
              When you visit paradapp.com, you may be presented with a cookie consent banner that allows you to:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-4">
              <li>Accept all cookies</li>
              <li>Reject non-essential cookies</li>
              <li>Customize your cookie preferences</li>
            </ul>
            <p className="leading-relaxed">
              You can also manage or delete cookies through your browser settings. Most browsers allow you to:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-4">
              <li>View stored cookies</li>
              <li>Delete cookies</li>
              <li>Block cookies entirely</li>
              <li>Block cookies from specific websites</li>
            </ul>
            <p className="leading-relaxed">
              Please note that disabling certain cookies may affect the functionality or performance of the Website.
            </p>
          </motion.div>

          <motion.div {...fadeInProps} className="space-y-4">
            <h2 className="text-2xl font-bold text-current">Do Not Track Signals</h2>
            <p className="leading-relaxed">
              Some web browsers allow users to send "Do Not Track" (DNT) signals. Currently, there is no universally accepted standard for responding to these signals.
            </p>
            <p className="leading-relaxed">
              As a result, Paradapp does not currently respond differently when a DNT signal is received.
            </p>
          </motion.div>

          <motion.div {...fadeInProps} className="space-y-4">
            <h2 className="text-2xl font-bold text-current">Updates to This Cookies Policy</h2>
            <p className="leading-relaxed">
              We may update this Cookies Policy from time to time to reflect changes in technology, legal requirements, or how our platform operates.
            </p>
            <p className="leading-relaxed">
              When updates occur, we will revise the "Last Updated" date at the top of this policy. In some cases, we may also provide additional notice where required by law.
            </p>
            <p className="leading-relaxed">
              We encourage users to review this policy periodically.
            </p>
          </motion.div>

          <motion.div {...fadeInProps} className="pt-12 border-t border-current/10">
            <h2 className="text-2xl font-bold text-current mb-4">Contact Us</h2>
            <p>If you have any questions about this Cookies Policy or how Paradapp uses cookies and related technologies, you can contact us at:</p>
            <p className="mt-4">Email: <a href="mailto:support@paradapp.com" className="underline underline-offset-4">support@paradapp.com</a></p>
          </motion.div>
        </section>
      </main>
    </div>

  );
}
